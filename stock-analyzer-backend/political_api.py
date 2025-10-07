# political_api.py
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import requests
import logging
import time
import csv
import os
from typing import Optional, List, Dict

router = APIRouter()
logger = logging.getLogger("political_api")
logging.basicConfig(level=logging.INFO)

CACHE = {}
def cache_get(key):
    rec = CACHE.get(key)
    if not rec: return None
    val, exp = rec
    if time.time() > exp:
        CACHE.pop(key, None)
        return None
    return val
def cache_set(key, val, ttl=300):
    CACHE[key] = (val, time.time() + ttl)

# Generic normalizer used for tradebrains / nse JSON shapes
def normalize_record(rec: dict) -> dict:
    symbol = str(rec.get("symbol") or rec.get("ticker") or rec.get("stockSymbol") or "").strip()
    person = rec.get("acquirerDisposerName") or rec.get("owner") or rec.get("insiderName") or rec.get("personName") or rec.get("name") or ""
    action_raw = (rec.get("transactionType") or rec.get("action") or rec.get("type") or "").upper()
    action = "BUY" if "BUY" in action_raw.upper() or "ACQUISITION" in action_raw.upper() else ("SELL" if "SELL" in action_raw.upper() or "DISPOSAL" in action_raw.upper() else "BUY")
    qty = rec.get("securitiesAcquiredDisposed") or rec.get("securitiesTraded") or rec.get("shares") or rec.get("quantity") or 0
    try:
        qty = int(float(qty))
    except:
        try:
            qty = int(''.join(ch for ch in str(qty) if ch.isdigit()) or 0)
        except:
            qty = 0
    price = rec.get("avgPricePerSecurity") or rec.get("price") or rec.get("pricePerShare") or 0.0
    try:
        price = float(price)
    except:
        price = 0.0
    value = rec.get("valueOfSecurity") or rec.get("value") or (qty * price)
    date = rec.get("dateOfIntimation") or rec.get("transactionDate") or rec.get("date") or ""
    category = rec.get("categoryOfPerson") or rec.get("category") or ""
    return {
        "id": rec.get("srNo") or f"{symbol}:{int(time.time()*1000)}",
        "personName": person,
        "category": category,
        "action": action,
        "stockSymbol": symbol,
        "stockName": rec.get("company") or rec.get("stockName") or "",
        "quantity": qty,
        "value": float(value) if value is not None else None,
        "pricePerShare": float(price) if price is not None else None,
        "transactionDate": date,
        "exchange": "NSE" if symbol.upper().endswith(".NS") or symbol and not symbol.upper().endswith(".BO") else "BSE",
        "portfolioImpact": rec.get("modeOfAcquisition") or ""
    }

# Provider: TradeBrains
def fetch_tradebrains(limit=200) -> List[Dict]:
    url = "https://portal.tradebrains.in/api/insider"
    try:
        r = requests.get(url, timeout=8)
        if r.status_code != 200:
            logger.info("TradeBrains status=%s", r.status_code)
            return []
        j = r.json()
        arr = j.get("data") or j.get("items") or (j if isinstance(j, list) else [])
        out = []
        for rec in arr[:limit]:
            out.append(normalize_record(rec))
        return out
    except Exception as e:
        logger.exception("fetch_tradebrains failed: %s", e)
        return []

# Provider: NSE "official" JSON (best-effort)
def fetch_nse(limit=200) -> List[Dict]:
    homepage = "https://www.nseindia.com"
    api_url = "https://www.nseindia.com/api/corporate-insider-trading?index=equities&page=1"
    session = requests.Session()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Referer": "https://www.nseindia.com/companies-listing/corporate-filings-insider-trading",
        "Accept-Language": "en-US,en;q=0.9"
    }
    try:
        # Do a quick homepage GET to get cookies/ak_bmsc etc.
        session.get(homepage, headers=headers, timeout=6)
        r = session.get(api_url, headers=headers, timeout=10)
        if r.status_code != 200:
            logger.info("NSE API returned %s", r.status_code)
            return []
        data = r.json()
        arr = data.get("data") or data.get("items") or (data if isinstance(data, list) else [])
        out = []
        for rec in arr[:limit]:
            out.append(normalize_record(rec))
        return out
    except Exception as e:
        logger.exception("fetch_nse failed: %s", e)
        return []

# Local CSV fallback reader
def read_csv_fallback(path="data/insider_trades.csv", limit=200) -> List[Dict]:
    if not os.path.exists(path):
        return []
    out = []
    try:
        with open(path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                if i >= limit: break
                # assume CSV columns match normalized keys: personName,stockSymbol,stockName,action,quantity,value,pricePerShare,transactionDate,category,exchange
                rec = {
                    "id": row.get("id") or f"csv:{i}",
                    "personName": row.get("personName",""),
                    "category": row.get("category",""),
                    "action": (row.get("action") or "").upper(),
                    "stockSymbol": row.get("stockSymbol",""),
                    "stockName": row.get("stockName",""),
                    "quantity": int(float(row.get("quantity") or 0)),
                    "value": float(row.get("value") or 0),
                    "pricePerShare": float(row.get("pricePerShare") or 0),
                    "transactionDate": row.get("transactionDate",""),
                    "exchange": row.get("exchange","NSE"),
                    "portfolioImpact": row.get("portfolioImpact","")
                }
                out.append(rec)
        return out
    except Exception as e:
        logger.exception("read_csv_fallback failed: %s", e)
        return []

def filter_trades(trades, exchange, start_date, end_date, category, search):
    sd = None
    ed = None
    try:
        if start_date: sd = start_date
        if end_date: ed = end_date
    except:
        sd = ed = None
    q = (search or "").strip().lower()
    out = []
    for t in trades:
        if exchange and t.get("exchange","").upper() != exchange.upper():
            continue
        if category and category != "All" and category.lower() not in (t.get("category","") or "").lower():
            continue
        if sd or ed:
            td = t.get("transactionDate","")
            try:
                # try ISO
                if td:
                    d = td if isinstance(td, str) else str(td)
                    # compare strings (frontend also uses iso). We'll be permissive.
                    if sd and d < sd: continue
                    if ed and d > ed: continue
            except:
                pass
        if q:
            combined = " ".join([str(t.get(k,"")) for k in ("personName","stockSymbol","stockName")]).lower()
            if q not in combined:
                continue
        out.append(t)
    return out

# API endpoint
@router.get("/api/political/trades")
def api_political_trades(
    exchange: str = Query("NSE"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100),
    mock: Optional[int] = Query(0),
    provider: Optional[str] = Query(None)   # debug: "tradebrains"|"nse" or None
):
    cache_key = ("political", exchange, start_date, end_date, category, search, limit, mock, provider)
    cached = cache_get(cache_key)
    if cached: return {"items": cached}

    if mock:
        # small development mock
        MOCK = [
            {"id":"m1","personName":"Mock Politician","category":"Politician","action":"BUY","stockSymbol":"RELIANCE.NS","stockName":"Reliance","quantity":1000,"value":2950000,"pricePerShare":2950,"transactionDate":"2024-01-15","exchange":"NSE","portfolioImpact":"Major"},
            {"id":"m2","personName":"Mock Promoter","category":"Promoter","action":"SELL","stockSymbol":"TCS.NS","stockName":"TCS","quantity":500,"value":2062500,"pricePerShare":4125,"transactionDate":"2024-01-14","exchange":"NSE","portfolioImpact":"Moderate"},
        ]
        cache_set(cache_key, MOCK, ttl=30)
        return {"items": MOCK}

    # Try chosen provider first (debug)
    details = []
    trades = []
    if provider == "tradebrains":
        trades = fetch_tradebrains(limit=limit)
        if not trades:
            details.append("tradebrains empty")
    elif provider == "nse":
        trades = fetch_nse(limit=limit)
        if not trades:
            details.append("nse empty")
    else:
        # 1) tradebrains
        tb = fetch_tradebrains(limit=limit)
        if tb:
            trades = tb
        else:
            details.append("tradebrains failed/empty")
            # 2) nse
            n = fetch_nse(limit=limit)
            if n:
                trades = n
            else:
                details.append("nse failed/empty")
                # 3) local CSV fallback
                csv_rows = read_csv_fallback(path="data/insider_trades.csv", limit=limit)
                if csv_rows:
                    trades = csv_rows
                else:
                    details.append("csv fallback missing/empty")

    if not trades:
        # return diagnostic details so you know why
        logger.info("api_political_trades: providers failed: %s", details)
        return JSONResponse(status_code=502, content={"error":"no_data_from_providers","details": details})

    filtered = filter_trades(trades, exchange, start_date, end_date, category, search)
    out = filtered[:limit]
    cache_set(cache_key, out, ttl=300)
    return {"items": out}
