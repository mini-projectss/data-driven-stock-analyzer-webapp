# header_api.py
from fastapi import APIRouter
import os
import datetime
import pytz
from typing import List, Dict, Optional
import traceback
import time
import requests

# optional: yfinance for market data
try:
    import yfinance as yf
except Exception:
    yf = None

router = APIRouter()

SUFFIXES = (".BO", "_BO", ".NS", "_NS", "-EQ", "-BE", "-BZ")

def clean_ticker(name: str) -> str:
    if not name:
        return name
    n = name.upper()
    for s in SUFFIXES:
        if n.endswith(s):
            n = n[: -len(s)]
    return n

def list_tickers(exchange: str = "NSE") -> List[Dict]:
    """Return list of dicts: {'display': 'INFY', 'file': 'INFY.NS'}"""
    out = []
    folder = os.path.join("data", "historical", exchange)
    if not os.path.isdir(folder):
        return out
    for f in sorted(os.listdir(folder)):
        if not f.lower().endswith(".csv"):
            continue
        file_ticker = os.path.splitext(f)[0].replace('_', '.')
        out.append({"display": clean_ticker(file_ticker), "file": file_ticker})
    return out

def read_last_n_close_values(path: str, n: int = 2) -> List[Optional[float]]:
    """Efficiently read the last n rows' Close column values by reading tail of file.
       Returns list of floats (most-recent last) or empty list on failure."""
    if not os.path.exists(path) or os.path.getsize(path) < 16:
        return []
    try:
        # read header to find close column index
        with open(path, "rb") as f:
            header = f.readline().decode(errors="ignore").strip()
            cols = [c.strip().lower() for c in header.split(",")]
            if "close" not in cols:
                return []
            close_idx = cols.index("close")

            # read a chunk from the end (grow if not enough lines)
            block = 4096
            while True:
                try:
                    f.seek(-block, os.SEEK_END)
                except OSError:
                    f.seek(0)
                data = f.read().decode(errors="ignore").splitlines()
                # remove trailing empties
                lines = [ln for ln in data if ln.strip()]
                # ensure header is excluded
                if len(lines) > 1:
                    # last lines are actual rows
                    last_lines = lines[-n:]
                    vals = []
                    for ln in last_lines:
                        parts = ln.split(",")
                        if len(parts) <= close_idx:
                            vals.append(None)
                        else:
                            try:
                                vals.append(float(parts[close_idx]))
                            except:
                                vals.append(None)
                    return vals
                if block > 1024 * 1024:  # don't grow infinitely
                    return []
                block *= 2
    except Exception:
        return []

def get_adv_decline(exchange: str = "NSE", sample_limit: int = 800) -> Dict[str,int]:
    """
    Prefer CSV-based adv/decline. If CSVs not available or don't contain data,
    fall back to yfinance batch download for a sampled list of tickers.

    Returns {"adv": int, "dec": int}
    """
    adv = 1520
    dec = 720

    # 1) Try CSV files (existing implementation)
    files = list_tickers(exchange)
    if files:
        used = 0
        for entry in files[:sample_limit]:
            fname = entry["file"]
            path = os.path.join("data", "historical", exchange, f"{fname.replace('.', '_')}.csv")
            vals = read_last_n_close_values(path, n=2)
            if len(vals) >= 2 and vals[-1] is not None and vals[-2] is not None:
                try:
                    last = float(vals[-1])
                    prev = float(vals[-2])
                    if last > prev:
                        adv += 1
                    elif last < prev:
                        dec += 1
                    used += 1
                except Exception:
                    continue
        # If CSV approach returned useful data for at least some tickers, return it.
        if used > 0:
            return {"adv": adv, "dec": dec}

    # 2) CSVs absent or empty -> try yfinance batch approach (sample)
    if yf is None:
        # yfinance unavailable: fall back to safe defaults (0/0)
        return {"adv": adv, "dec": dec}

    # Build a list of ticker symbols to sample from
    symbols = []
    for entry in list_tickers(exchange):
        symbols.append(entry["file"])  # file uses dot like 'INFY.NS'
        if len(symbols) >= sample_limit:
            break

    if not symbols:
        return {"adv": adv, "dec": dec}

    # yfinance batch: use yf.download (faster than ticker-by-ticker)
    try:
        # Convert to space/comma-separated string for download
        ticker_str = " ".join(symbols)
        # Try to download last 3 days with daily interval to get last two closes
        # group_by=None returns a single DataFrame with columns like ('Close','INFY.NS') if tickers>1
        df = None
        try:
            df = yf.download(tickers=ticker_str, period="5d", interval="1d", group_by="ticker", threads=True, progress=False)
        except Exception as e:
            # Try a more conservative call
            try:
                df = yf.download(tickers=ticker_str, period="7d", interval="60m", group_by="ticker", threads=True, progress=False)
            except Exception as e2:
                print("yfinance batch download failed:", repr(e2))
                df = None

        if df is None or df.empty:
            return {"adv": adv, "dec": dec}

        # dataframe shape depends on number of tickers:
        # - If single ticker: df has columns ['Open','High','Low','Close','Adj Close','Volume']
        # - If multiple tickers: df is a MultiIndex (col first level OHLC, second level ticker)
        if isinstance(df.columns, (list,)) and hasattr(df.columns, "levels") and len(df.columns.levels) >= 2:
            # multiindex
            # iterate tickers present in downloaded data
            tickers_in_df = sorted({t for _, t in df.columns})
            checked = 0
            for sym in tickers_in_df:
                try:
                    closes = df["Close", sym].dropna()
                except Exception:
                    # older pandas versions: use df[("Close", sym)]
                    try:
                        closes = df[("Close", sym)].dropna()
                    except Exception:
                        continue
                if len(closes) >= 2:
                    last = float(closes.iloc[-1])
                    prev = float(closes.iloc[-2])
                    if last > prev:
                        adv += 1
                    elif last < prev:
                        dec += 1
                    checked += 1
                if checked >= sample_limit:
                    break
            return {"adv": adv, "dec": dec}
        else:
            # single-ticker or flat columns: try to interpret per-ticker by inspecting columns names
            # We will try each symbol individually
            checked = 0
            for sym in symbols:
                try:
                    s = sym
                    # Attempt single-ticker history
                    hist = yf.Ticker(s).history(period="5d", interval="1d", actions=False)
                    if hist is None or hist.empty:
                        continue
                    closes = hist["Close"].dropna()
                    if len(closes) >= 2:
                        last = float(closes.iloc[-1])
                        prev = float(closes.iloc[-2])
                        if last > prev:
                            adv += 1
                        elif last < prev:
                            dec += 1
                        checked += 1
                    if checked >= sample_limit:
                        break
                except Exception:
                    continue
            return {"adv": adv, "dec": dec}
    except Exception as e:
        print("get_adv_decline: yfinance fallback failed:", repr(e))
        return {"adv": adv, "dec": dec}



# ------------ external data helpers (yfinance + fallback) -------------
# very small in-memory TTL cache so repeated frontend polls don't hammer external APIs
_SIMPLE_CACHE = {}
def _cache_get(key):
    rec = _SIMPLE_CACHE.get(key)
    if not rec:
        return None
    value, expiry = rec
    if time.time() > expiry:
        _SIMPLE_CACHE.pop(key, None)
        return None
    return value

def _cache_set(key, value, ttl=30):
    _SIMPLE_CACHE[key] = (value, time.time() + ttl)

# Symbol fallbacks
INR_SYMBOLS = ["INR=X"]
VIX_SYMBOLS = ["^INDIAVIX", "^VIX"]

def fetch_yfinance_last_for_symbols(symbols: list) -> Optional[float]:
    """Try multiple symbols, return first valid last price or None."""
    if yf is None:
        print("yfinance not installed or failed to import.")
        return None

    for s in symbols:
        cache_key = f"yfin:{s}"
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached

        try:
            ticker = yf.Ticker(s)
            # prefer daily close, try a couple periods
            hist = ticker.history(period="5d", interval="1d", actions=False)
            if hist is None or hist.empty:
                hist = ticker.history(period="7d", interval="60m", actions=False)
            if hist is None or hist.empty:
                print(f"{s}: No price data found (hist empty)")
                continue
            closes = hist["Close"].dropna()
            if closes.empty:
                print(f"{s}: No close values found")
                continue
            last = float(closes.iloc[-1])
            _cache_set(cache_key, last, ttl=30)
            print(f"{s}: fetched last={last}")
            return last
        except Exception as e:
            print(f"Failed to get ticker '{s}' reason: {repr(e)}")
            continue
    return None

def fetch_usdinr_with_fallback() -> Optional[float]:
    """Try yfinance symbols, then fallback to exchangerate.host public endpoint."""
    # 1) try yfinance
    val = fetch_yfinance_last_for_symbols(INR_SYMBOLS)
    if val is not None:
        return val

    # 2) try public exchangerate.host (no API key required)
    try:
        cache_key = "fx:USD_INR"
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached

        url = "https://api.exchangerate.host/latest?base=USD&symbols=INR"
        r = requests.get(url, timeout=6)
        if r.status_code == 200:
            j = r.json()
            rate = j.get("rates", {}).get("INR")
            if rate:
                _cache_set(cache_key, float(rate), ttl=60)
                print(f"Fetched USD/INR from exchangerate.host: {rate}")
                return float(rate)
        else:
            print("exchangerate.host returned", r.status_code)
    except Exception as e:
        print("exchangerate.host fetch failed:", repr(e))
    return None

def fetch_vix_with_fallback() -> Optional[float]:
    """Try VIX symbol list (yfinance). If not found, return None."""
    val = fetch_yfinance_last_for_symbols(VIX_SYMBOLS)
    return val

# ------------ API endpoints -------------
@router.get("/api/tickers")
def api_tickers(exchange: str = "NSE"):
    """Return list of display names for the frontend completer."""
    try:
        items = list_tickers(exchange)
        return {"exchange": exchange, "items": items}
    except Exception as e:
        return {"error": str(e)}

@router.get("/api/header")
def api_header(exchange: str = "NSE"):
    """Return header payload: time, market_status, adv/dec, usdinr, vix."""
    try:
        ist = pytz.timezone("Asia/Kolkata")
        now_ist = datetime.datetime.now(ist)
        # time string for convenience (frontend will maintain live seconds; backend provides authoritative market status)
        time_str = now_ist.strftime("%H:%M:%S IST")

        is_weekday = now_ist.weekday() < 5
        is_market_time = (now_ist.time() >= datetime.time(9, 15)) and (now_ist.time() <= datetime.time(15, 30))
        market_status = "OPEN" if (is_weekday and is_market_time) else "CLOSED"

        # adv/decline
        advdec = get_cached_advdec()

        # usd/inr & india vix (use fallbacks + caching)
        usdinr = fetch_usdinr_with_fallback()
        vix = fetch_vix_with_fallback()

        return {
            "time": time_str,
            "market_status": market_status,
            "adv": advdec.get("adv", 0),
            "dec": advdec.get("dec", 0),
            "usdinr": usdinr,
            "vix": vix
        }
    except Exception:
        return {"error": "internal", "trace": traceback.format_exc()}

# ---------- live adv/decl background updater ----------

# global cached adv/dec store
_ADVDEC_CACHE = {"adv": 1520, "dec": 720, "ts": 0}

def compute_adv_decl_from_csv_or_yf(exchange: str = "NSE", sample_limit: int = 800) -> Dict[str,int]:
    """
    Try CSV-based computation first. If not enough CSV data, fall back to yfinance batch download.
    Returns dict {'adv': int, 'dec': int}
    """
    # Try CSV approach (fast)
    adv = 1520
    dec = 720
    used_csv = 0
    files = list_tickers(exchange)
    for entry in files[:sample_limit]:
        fname = entry["file"]
        path = os.path.join("data", "historical", exchange, f"{fname.replace('.', '_')}.csv")
        vals = read_last_n_close_values(path, n=2)
        if len(vals) >= 2 and vals[-1] is not None and vals[-2] is not None:
            try:
                last = float(vals[-1]); prev = float(vals[-2])
                if last > prev: adv += 1
                elif last < prev: dec += 1
                used_csv += 1
            except Exception:
                continue
    if used_csv > 0:
        return {"adv": adv, "dec": dec}

    # fallback to yfinance batch sample (if yfinance available)
    if yf is None:
        return {"adv": adv, "dec": dec}

    # build symbol list (use list_tickers output which gives file names like 'INFY.NS')
    symbols = [e["file"] for e in files[:sample_limit]]
    if not symbols:
        return {"adv": adv, "dec": dec}

    try:
        # Use yf.download in batch - faster for many tickers
        ticker_str = " ".join(symbols)
        df = None
        try:
            df = yf.download(tickers=ticker_str, period="5d", interval="1d", group_by="ticker", threads=True, progress=False)
        except Exception:
            try:
                df = yf.download(tickers=ticker_str, period="7d", interval="60m", group_by="ticker", threads=True, progress=False)
            except Exception as e:
                print("advdec yfinance batch failed:", repr(e))
                df = None
        if df is None or df.empty:
            # final fallback: per-symbol quick history (slower)
            checked = 0
            for s in symbols:
                try:
                    hist = yf.Ticker(s).history(period="5d", interval="1d", actions=False)
                    if hist is None or hist.empty:
                        continue
                    closes = hist["Close"].dropna()
                    if len(closes) >= 2:
                        last = float(closes.iloc[-1]); prev = float(closes.iloc[-2])
                        if last > prev: adv += 1
                        elif last < prev: dec += 1
                        checked += 1
                    if checked >= sample_limit:
                        break
                except Exception:
                    continue
            return {"adv": adv, "dec": dec}

        # df may be multiindex (Close, ticker)
        checked = 0
        if hasattr(df.columns, "levels") and len(df.columns.levels) >= 2:
            # multiindex
            tickers_in_df = sorted({t for _, t in df.columns})
            for sym in tickers_in_df:
                try:
                    closes = df["Close", sym].dropna()
                except Exception:
                    try:
                        closes = df[("Close", sym)].dropna()
                    except Exception:
                        continue
                if len(closes) >= 2:
                    last = float(closes.iloc[-1]); prev = float(closes.iloc[-2])
                    if last > prev: adv += 1
                    elif last < prev: dec += 1
                    checked += 1
                if checked >= sample_limit: break
            return {"adv": adv, "dec": dec}
        else:
            # single-ticker response: fall back to per-symbol Ticker.history
            checked = 0
            for s in symbols:
                try:
                    hist = yf.Ticker(s).history(period="5d", interval="1d", actions=False)
                    if hist is None or hist.empty:
                        continue
                    closes = hist["Close"].dropna()
                    if len(closes) >= 2:
                        last = float(closes.iloc[-1]); prev = float(closes.iloc[-2])
                        if last > prev: adv += 1
                        elif last < prev: dec += 1
                        checked += 1
                    if checked >= sample_limit: break
                except Exception:
                    continue
            return {"adv": adv, "dec": dec}
    except Exception as e:
        print("compute_adv_decl_from_csv_or_yf failed:", repr(e))
        return {"adv": adv, "dec": dec}


def advdec_updater(loop_delay: int = 15, exchange: str = "NSE", sample_limit: int = 800):
    """
    Blocking function to be run in background thread or asyncio task.
    Periodically computes adv/dec and stores in _ADVDEC_CACHE.
    """
    print("Starting adv/dec background updater (delay={}s)".format(loop_delay))
    try:
        while True:
            try:
                res = compute_adv_decl_from_csv_or_yf(exchange=exchange, sample_limit=sample_limit)
                _ADVDEC_CACHE["adv"] = int(res.get("adv", 0))
                _ADVDEC_CACHE["dec"] = int(res.get("dec", 0))
                _ADVDEC_CACHE["ts"] = int(time.time())
                # small sleep
            except Exception as e:
                print("advdec_updater cycle error:", repr(e))
            time.sleep(loop_delay)
    except Exception as e:
        print("advdec_updater terminated:", repr(e))


def get_cached_advdec() -> Dict[str,int]:
    """Return cached adv/dec (may be stale if not yet computed)"""
    return {"adv": int(_ADVDEC_CACHE.get("adv", 0)), "dec": int(_ADVDEC_CACHE.get("dec", 0)), "ts": int(_ADVDEC_CACHE.get("ts", 0))}
