# political_api.py
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import os
import logging
import time
import requests
from typing import List, Optional, Dict
import datetime

router = APIRouter()
logger = logging.getLogger(__name__)

# small in-memory cache
_SIMPLE_CACHE = {}
def _cache_get(key):
    rec = _SIMPLE_CACHE.get(key)
    if not rec:
        return None
    val, expiry = rec
    if time.time() > expiry:
        _SIMPLE_CACHE.pop(key, None)
        return None
    return val

def _cache_set(key, value, ttl=20):
    _SIMPLE_CACHE[key] = (value, time.time() + ttl)

# --- Mock fallback dataset (same shape as frontend expects) ---
MOCK_TRADES = [
    {
      "id": "1",
      "personName": "Ravi Shankar Prasad",
      "category": "Politician",
      "action": "BUY",
      "stockSymbol": "RELIANCE.NS",
      "stockName": "Reliance Industries Limited",
      "quantity": 5000,
      "value": 14753750,
      "pricePerShare": 2950.75,
      "transactionDate": "2024-01-15",
      "exchange": "NSE",
      "portfolioImpact": "Major"
    },
    {
      "id": "2",
      "personName": "Mukesh Ambani",
      "category": "Promoter",
      "action": "SELL",
      "stockSymbol": "TCS.NS",
      "stockName": "Tata Consultancy Services Limited",
      "quantity": 2500,
      "value": 10313250,
      "pricePerShare": 4125.30,
      "transactionDate": "2024-01-14",
      "exchange": "NSE",
      "portfolioImpact": "Moderate"
    },
    {
      "id": "3",
      "personName": "Nirmala Sitharaman",
      "category": "Politician",
      "action": "BUY",
      "stockSymbol": "INFY.NS",
      "stockName": "Infosys Limited",
      "quantity": 8000,
      "value": 13937600,
      "pricePerShare": 1742.20,
      "transactionDate": "2024-01-13",
      "exchange": "NSE",
      "portfolioImpact": "Major"
    },
    {
      "id": "4",
      "personName": "Gautam Adani",
      "category": "Promoter",
      "action": "BUY",
      "stockSymbol": "ADANIPORTS.NS",
      "stockName": "Adani Ports and Special Economic Zone Limited",
      "quantity": 15000,
      "value": 11250000,
      "pricePerShare": 750.00,
      "transactionDate": "2024-01-12",
      "exchange": "NSE",
      "portfolioImpact": "Major"
    },
    {
      "id": "5",
      "personName": "Piyush Goyal",
      "category": "Politician",
      "action": "SELL",
      "stockSymbol": "ICICIBANK.NS",
      "stockName": "ICICI Bank Limited",
      "quantity": 3000,
      "value": 3374250,
      "pricePerShare": 1124.75,
      "transactionDate": "2024-01-11",
      "exchange": "NSE",
      "portfolioImpact": "Minor"
    },
    {
      "id": "6",
      "personName": "Ajay Piramal",
      "category": "Promoter",
      "action": "BUY",
      "stockSymbol": "PIRAMAL.NS",
      "stockName": "Piramal Enterprises Limited",
      "quantity": 12000,
      "value": 9600000,
      "pricePerShare": 800.00,
      "transactionDate": "2024-01-10",
      "exchange": "NSE",
      "portfolioImpact": "Major"
    },
    {
      "id": "7",
      "personName": "Smriti Irani",
      "category": "Politician",
      "action": "BUY",
      "stockSymbol": "HDFCBANK.NS",
      "stockName": "HDFC Bank Limited",
      "quantity": 4000,
      "value": 6743600,
      "pricePerShare": 1685.90,
      "transactionDate": "2024-01-09",
      "exchange": "NSE",
      "portfolioImpact": "Moderate"
    },
    {
      "id": "8",
      "personName": "Rahul Bajaj",
      "category": "Promoter",
      "action": "SELL",
      "stockSymbol": "BAJFINANCE.NS",
      "stockName": "Bajaj Finance Limited",
      "quantity": 1500,
      "value": 9750000,
      "pricePerShare": 6500.00,
      "transactionDate": "2024-01-08",
      "exchange": "NSE",
      "portfolioImpact": "Major"
    }
]

def _parse_date(s: Optional[str]):
    if not s:
        return None
    try:
        return datetime.datetime.fromisoformat(s).date()
    except Exception:
        try:
            return datetime.datetime.strptime(s, "%Y-%m-%d").date()
        except Exception:
            return None

def _filter_trades(trades: List[Dict], exchange: str, start_date: Optional[str], end_date: Optional[str], category: Optional[str], search: Optional[str]) -> List[Dict]:
    sd = _parse_date(start_date)
    ed = _parse_date(end_date)
    out = []
    q = (search or "").strip().lower() if search else ""
    for t in trades:
        if exchange and t.get("exchange", "").upper() != exchange.upper():
            continue
        if category and category != "All" and t.get("category") != category:
            continue
        if sd or ed:
            try:
                td = _parse_date(t.get("transactionDate"))
                if sd and td < sd:
                    continue
                if ed and td > ed:
                    continue
            except Exception:
                pass
        if q:
            if q not in (t.get("personName","").lower() + " " + t.get("stockSymbol","").lower() + " " + t.get("stockName","").lower()):
                continue
        out.append(t)
    return out

def _normalize_external_item(raw: dict) -> Optional[dict]:
    """
    Attempt to normalize an external API record into our shape.
    The external provider will vary; this small adapter tries common keys.
    """
    try:
        return {
            "id": str(raw.get("id") or raw.get("tradeId") or raw.get("transaction_id") or raw.get("uid") or int(time.time()*1000)),
            "personName": raw.get("personName") or raw.get("name") or raw.get("actor") or "",
            "category": raw.get("category") or raw.get("role") or "Politician",
            "action": (raw.get("action") or raw.get("type") or "BUY").upper(),
            "stockSymbol": raw.get("stockSymbol") or raw.get("symbol") or raw.get("ticker") or "",
            "stockName": raw.get("stockName") or raw.get("company") or "",
            "quantity": int(raw.get("quantity") or raw.get("qty") or 0),
            "value": float(raw.get("value") or raw.get("amount") or 0),
            "pricePerShare": float(raw.get("price") or raw.get("pricePerShare") or 0),
            "transactionDate": raw.get("transactionDate") or raw.get("date") or "",
            "exchange": (raw.get("exchange") or "NSE").upper(),
            "portfolioImpact": raw.get("portfolioImpact") or raw.get("impact") or ""
        }
    except Exception:
        return None

# --- API endpoints ---
@router.get("/api/political/trades")
def api_political_trades(
    exchange: str = Query("NSE", description="NSE or BSE"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(500)
):
    """
    Returns list of political/promoter trades.
    If POLITICAL_TRADES_API env var is set, attempts remote fetch and maps results.
    Otherwise returns mocked fallback data.
    Supports query params: exchange, start_date (YYYY-MM-DD), end_date, category, search.
    """
    cache_key = ("political_trades", exchange, start_date, end_date, category, search, limit)
    cached = _cache_get(cache_key)
    if cached is not None:
        return {"items": cached}

    # 1) Try external provider if configured
    provider = os.environ.get("POLITICAL_TRADES_API", "").strip()
    items = []
    if provider:
        try:
            params = {
                "exchange": exchange,
                "start_date": start_date,
                "end_date": end_date,
                "category": category,
                "search": search,
                "limit": limit
            }
            r = requests.get(provider, params=params, timeout=8)
            if r.status_code == 200:
                raw = r.json()
                # adapt depending on response shape
                raw_list = []
                if isinstance(raw, dict):
                    # common keys: 'data', 'items'
                    if "items" in raw:
                        raw_list = raw["items"]
                    elif "data" in raw:
                        raw_list = raw["data"]
                    else:
                        # maybe top-level list-like dict values
                        raw_list = []
                elif isinstance(raw, list):
                    raw_list = raw
                for rec in raw_list:
                    nr = _normalize_external_item(rec)
                    if nr:
                        items.append(nr)
        except Exception as e:
            logger.exception("political_api: external provider fetch failed: %s", e)

    # 2) if provider returned nothing, use mock
    if not items:
        items = MOCK_TRADES.copy()

    # 3) Local filtering (guarantee consistent behavior)
    filtered = _filter_trades(items, exchange, start_date, end_date, category, search)
    if len(filtered) > limit:
        filtered = filtered[:limit]

    _cache_set(cache_key, filtered, ttl=12)
    return {"items": filtered}


@router.get("/api/political/summary")
def api_political_summary(
    exchange: str = Query("NSE"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """Return aggregated summary for UI (buys/sells counts & values)."""
    try:
        trades_resp = api_political_trades(exchange=exchange, start_date=start_date, end_date=end_date, category=category, search=search, limit=2000)
        items = trades_resp.get("items", [])
        buys = [t for t in items if t.get("action","").upper() == "BUY"]
        sells = [t for t in items if t.get("action","").upper() == "SELL"]
        total_buy_value = sum(float(t.get("value",0) or 0) for t in buys)
        total_sell_value = sum(float(t.get("value",0) or 0) for t in sells)
        return {
            "totalBuys": len(buys),
            "totalSells": len(sells),
            "totalBuyValue": total_buy_value,
            "totalSellValue": total_sell_value,
            "netValue": total_buy_value - total_sell_value
        }
    except Exception:
        logger.exception("api_political_summary: internal error")
        return JSONResponse(status_code=500, content={"error": "internal"})
