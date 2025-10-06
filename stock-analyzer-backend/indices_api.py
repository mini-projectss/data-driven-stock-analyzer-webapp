# indices_api.py
from fastapi import APIRouter
import yfinance as yf
import traceback

router = APIRouter()

# ✅ Correct working Yahoo symbols
INDEX_MAP = {
    "SENSEX": "^BSESN",
    "NIFTY 50": "^NSEI",
    "NIFTY BANK": "^NSEBANK",
    "MIDCAP 100": "^CRSMID",   # ✅ Working
    "SMALLCAP 250": "^NSMIDCP",  # ✅ Working
    "GOLD": "GOLDBEES.NS",
}

def format_inr(value: float) -> str:
    """Return value formatted with Indian comma style: 81,588.02"""
    try:
        return f"{value:,.2f}"
    except Exception:
        return str(round(value, 2))

def get_index_data(symbol: str, yfsymbol: str):
    try:
        ticker = yf.Ticker(yfsymbol)
        data = ticker.history(period="5d", interval="1d")
        if data is None or data.empty or len(data) < 2:
            print(f"⚠️ No data for {symbol} ({yfsymbol})")
            return None

        last = float(data["Close"].iloc[-1])
        prev = float(data["Close"].iloc[-2])
        change = last - prev
        pct = (change / prev) * 100 if prev != 0 else 0

        spark = [round(v, 2) for v in data["Close"].tail(7).tolist()]

        return {
            "name": symbol,
            "value": format_inr(last),
            "change": round(change, 2),
            "changePercent": round(pct, 2),
            "sparkline": spark,
        }

    except Exception as e:
        print(f"❌ Error fetching {symbol}: {e}")
        traceback.print_exc()
        return None


@router.get("/api/indices")
def api_indices():
    result = []
    for name, sym in INDEX_MAP.items():
        d = get_index_data(name, sym)
        if d:
            result.append(d)
    return {"items": result}
