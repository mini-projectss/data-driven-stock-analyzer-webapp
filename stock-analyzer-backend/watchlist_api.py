# watchlist_api.py

from fastapi import APIRouter, HTTPException
from typing import List
import yfinance as yf

router = APIRouter()

@router.post("/watchlist/prices")
def get_prices(symbols: List[str]):
    """
    Given a list of stock symbols (e.g. ["RELIANCE", "TCS"]),
    fetch latest price, daily change, and percent change using yfinance.
    Returns a list of dicts with those fields.
    """
    results = []
    for symbol in symbols:
        try:
            # Optionally append exchange suffix if needed, e.g. “.NS”
            ticker = yf.Ticker(symbol)  # adjust based on exchange
            hist = ticker.history(period="2d")  # last 2 days to compute change
            if hist.shape[0] >= 1:
                # latest closing price
                latest = hist["Close"].iloc[-1]
                prev = hist["Close"].iloc[-2] if hist.shape[0] > 1 else latest
                change = latest - prev
                pct_change = (change / prev * 100) if prev != 0 else 0
                results.append({
                    "symbol": symbol,
                    "ltp": round(float(latest), 2),
                    "dailyChange": round(float(change), 2),
                    "dailyChangePercent": round(float(pct_change), 2),
                })
        except Exception as e:
            # If one symbol errors, skip it
            print(f"Error fetching {symbol}: {e}")
    return results
