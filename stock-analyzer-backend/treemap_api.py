# treemap_api.py
from fastapi import APIRouter, Query
import yfinance as yf
import traceback
import random

router = APIRouter()

# sample popular NSE/BSE tickers (you can expand this)
NSE_TICKERS = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "BHARTIARTL.NS", "ASIANPAINT.NS", "BAJAJ-AUTO.NS", "MARUTI.NS", "WIPRO.NS", "LT.NS"]
BSE_TICKERS = ["RELIANCE.BO", "TCS.BO", "INFY.BO", "HDFCBANK.BO", "ICICIBANK.BO", "SBIN.BO", "BHARTIARTL.BO", "ASIANPAINT.BO", "BAJAJ-AUTO.BO", "MARUTI.BO", "WIPRO.BO", "LT.BO"]

@router.get("/api/treemap")
def api_treemap(exchange: str = Query("NSE")):
    tickers = NSE_TICKERS if exchange.upper() == "NSE" else BSE_TICKERS
    results = []
    for sym in tickers:
        try:
            data = yf.Ticker(sym).history(period="2d", interval="1d")
            if data is None or data.empty:
                continue
            last = float(data["Close"].iloc[-1])
            prev = float(data["Close"].iloc[-2])
            vol = float(data["Volume"].iloc[-1])
            change = ((last - prev) / prev) * 100 if prev else 0
            results.append({
                "symbol": sym.split(".")[0],
                "volume": vol,
                "change": round(change, 2),
            })
        except Exception as e:
            print(f"Error fetching {sym}: {e}")
            continue

    # normalize size dynamically based on dataset
    if results:
        max_vol = max(r["volume"] for r in results)
        min_vol = min(r["volume"] for r in results)
        for r in results:
            vol_norm = (r["volume"] - min_vol) / (max_vol - min_vol + 1)
            r["size"] = 10 + vol_norm * 25  # between 10 and 35

    # fallback mock if empty
    if not results:
        results = [
            {"symbol": "RELIANCE", "volume": 20000000, "change": random.uniform(-2, 2), "size": 20},
            {"symbol": "TCS", "volume": 15000000, "change": random.uniform(-2, 2), "size": 18},
            {"symbol": "INFY", "volume": 12000000, "change": random.uniform(-2, 2), "size": 16},
        ]

    return {"items": results}
