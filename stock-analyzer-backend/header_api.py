# header_api.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse
import os
import datetime
import pytz
from typing import List, Dict, Optional
import traceback
import time
import requests
import random
import csv
from pathlib import Path
import logging

# logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# router
router = APIRouter()

# optional: yfinance
try:
    import yfinance as yf
except Exception:
    yf = None

# global caches / state
_SIM_TICK_COUNTER = 0
_ADVDEC_CACHE = {"adv": 0, "dec": 0, "ts": 0}
_SIMPLE_CACHE = {}

# constants
SUFFIXES = (".BO", "_BO", ".NS", "_NS", "-EQ", "-BE", "-BZ")
INR_SYMBOLS = ["INR=X"]
VIX_SYMBOLS = ["^INDIAVIX", "^VIX"]


# ---------------- utility: data folder resolution ----------------
def get_data_folder(exchange: str = "NSE") -> Optional[str]:
    """
    Resolve the absolute folder path for historical CSVs for the given exchange.
    Tries several likely locations and returns the first valid path or None.
    """
    exch = (exchange or "NSE").upper()
    candidates = []

    # 1) data/historical/<exchange> relative to current working directory
    candidates.append(Path(os.getcwd()) / "data" / "historical" / exch)

    # 2) parent of cwd (in case backend runs from stock-analyzer-backend/) -> ../data/historical/<exchange>
    candidates.append(Path(os.getcwd()).parent / "data" / "historical" / exch)

    # 3) relative to file location (package), e.g., ../data/historical/<exchange> or ../../data/historical/<exchange>
    this_dir = Path(__file__).resolve().parent
    candidates.append((this_dir / ".." / "data" / "historical" / exch).resolve())
    candidates.append((this_dir / ".." / ".." / "data" / "historical" / exch).resolve())

    for p in candidates:
        try:
            pnorm = Path(p).resolve()
        except Exception:
            continue
        if pnorm.is_dir():
            logger.info("get_data_folder: using folder %s", pnorm)
            return str(pnorm)
    logger.info("get_data_folder: no data folder found for exchange=%s; tried %s", exch, candidates)
    return None


# ---------------- helpers for tickers and CSV reading ----------------
def clean_ticker(name: str) -> str:
    if not name:
        return name
    n = name.upper()
    for s in SUFFIXES:
        if n.endswith(s):
            n = n[: -len(s)]
    return n


def list_tickers(exchange: str = "NSE") -> List[Dict]:
    """
    Return list of dicts: {'display': 'INFY', 'file': 'INFY.NS'}.
    Uses get_data_folder() to find real folder locations.
    """
    out = []
    folder = get_data_folder(exchange)
    if not folder:
        return out
    try:
        for f in sorted(os.listdir(folder)):
            if not f.lower().endswith(".csv"):
                continue
            file_ticker = os.path.splitext(f)[0].replace('_', '.')
            out.append({"display": clean_ticker(file_ticker), "file": file_ticker})
    except Exception as e:
        logger.exception("list_tickers error: %s", e)
    return out


def read_last_n_close_values(path: str, n: int = 2) -> List[Optional[float]]:
    """
    Efficiently read the last n rows' Close column values by reading tail of file.
    Returns list of floats (most-recent last) or empty list on failure.
    """
    if not os.path.exists(path) or os.path.getsize(path) < 16:
        return []
    try:
        with open(path, "rb") as f:
            header = f.readline().decode(errors="ignore").strip()
            cols = [c.strip().lower() for c in header.split(",")]
            if "close" not in cols:
                return []
            close_idx = cols.index("close")

            block = 4096
            while True:
                try:
                    f.seek(-block, os.SEEK_END)
                except OSError:
                    f.seek(0)
                data = f.read().decode(errors="ignore").splitlines()
                lines = [ln for ln in data if ln.strip()]
                if len(lines) > 1:
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
                if block > 1024 * 1024:
                    return []
                block *= 2
    except Exception:
        return []


def _safe_read_csv_rows(path: str, max_rows: int = 200000) -> List[Dict]:
    """
    Read CSV and return rows as list of dicts with keys: date, open, high, low, close, volume.
    Will parse common date column names and numeric columns.
    """
    if not os.path.exists(path):
        logger.info("_safe_read_csv_rows: path not found: %s", path)
        return []
    rows = []
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for i, r in enumerate(reader):
                if i >= max_rows:
                    break
                def _get_float(keys):
                    for k in keys:
                        if k in r and r[k] not in (None, ""):
                            try:
                                return float(r[k])
                            except:
                                pass
                    return None
                date_val = None
                for k in ("date", "Date", "DATE"):
                    if k in r and r[k]:
                        date_val = r[k]
                        break
                rows.append({
                    "date": date_val,
                    "open": _get_float(["open", "Open", "OPEN"]),
                    "high": _get_float(["high", "High", "HIGH"]),
                    "low": _get_float(["low", "Low", "LOW"]),
                    "close": _get_float(["close", "Close", "CLOSE", "adj close", "Adj Close"]),
                    "volume": _get_float(["volume", "Volume", "VOLUME"])
                })
    except Exception as e:
        logger.exception("_safe_read_csv_rows: failed to read %s: %s", path, e)
        return []
    return rows


# ---------------- adv/decl (uses CSV or yfinance fallback) ----------------
def get_adv_decline(exchange: str = "NSE", sample_limit: int = 800) -> Dict[str, int]:
    """
    Prefer CSV-based adv/decline. If CSVs not available or don't contain data,
    fall back to yfinance batch download for a sampled list of tickers.
    Returns {"adv": int, "dec": int}
    """
    adv = 1520
    dec = 720

    files = list_tickers(exchange)
    if files:
        used = 0
        for entry in files[:sample_limit]:
            fname = entry["file"]
            folder = get_data_folder(exchange)
            if not folder:
                continue
            path = os.path.join(folder, f"{fname.replace('.', '_')}.csv")
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
        if used > 0:
            return {"adv": adv, "dec": dec}

    # yfinance fallback
    if yf is None:
        return {"adv": adv, "dec": dec}

    symbols = []
    for entry in files:
        symbols.append(entry["file"])
        if len(symbols) >= sample_limit:
            break
    if not symbols:
        return {"adv": adv, "dec": dec}

    try:
        ticker_str = " ".join(symbols)
        df = None
        try:
            df = yf.download(tickers=ticker_str, period="5d", interval="1d", group_by="ticker", threads=True, progress=False)
        except Exception:
            try:
                df = yf.download(tickers=ticker_str, period="7d", interval="60m", group_by="ticker", threads=True, progress=False)
            except Exception as e:
                print("yfinance batch download failed:", repr(e))
                df = None

        if df is None or df.empty:
            return {"adv": adv, "dec": dec}

        if hasattr(df.columns, "levels") and len(df.columns.levels) >= 2:
            tickers_in_df = sorted({t for _, t in df.columns})
            checked = 0
            for sym in tickers_in_df:
                try:
                    closes = df["Close", sym].dropna()
                except Exception:
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
            checked = 0
            for sym in symbols:
                try:
                    hist = yf.Ticker(sym).history(period="5d", interval="1d", actions=False)
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


# small in-memory cache helpers
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


def fetch_yfinance_last_for_symbols(symbols: list) -> Optional[float]:
    if yf is None:
        logger.info("fetch_yfinance_last_for_symbols: yfinance not available")
        return None
    for s in symbols:
        cache_key = f"yfin:{s}"
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached
        try:
            ticker = yf.Ticker(s)
            hist = ticker.history(period="5d", interval="1d", actions=False)
            if hist is None or hist.empty:
                hist = ticker.history(period="7d", interval="60m", actions=False)
            if hist is None or hist.empty:
                logger.info("%s: No price data found (hist empty)", s)
                continue
            closes = hist["Close"].dropna()
            if closes.empty:
                logger.info("%s: No close values found", s)
                continue
            last = float(closes.iloc[-1])
            _cache_set(cache_key, last, ttl=30)
            logger.info("%s: fetched last=%s", s, last)
            return last
        except Exception as e:
            logger.exception("Failed to get ticker '%s' reason: %s", s, e)
            continue
    return None

def fetch_usdinr_with_fallback() -> Optional[float]:
    val = fetch_yfinance_last_for_symbols(INR_SYMBOLS)
    if val is not None:
        return val
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
                logger.info("Fetched USD/INR from exchangerate.host: %s", rate)
                return float(rate)
        else:
            logger.info("exchangerate.host returned %s", r.status_code)
    except Exception as e:
        logger.exception("exchangerate.host fetch failed: %s", e)
    return None

def fetch_vix_with_fallback() -> Optional[float]:
    return fetch_yfinance_last_for_symbols(VIX_SYMBOLS)


# ---------------- API endpoints ----------------
@router.get("/api/tickers")
def api_tickers(exchange: str = "NSE"):
    """Return list of display names for the frontend completer."""
    try:
        items = list_tickers(exchange)
        return {"exchange": exchange, "items": items}
    except Exception as e:
        logger.exception("api_tickers error: %s", e)
        return {"error": str(e)}


@router.get("/api/header")
def api_header(exchange: str = "NSE"):
    """Return header payload: time, market_status, adv/dec, usdinr, vix."""
    try:
        ist = pytz.timezone("Asia/Kolkata")
        now_ist = datetime.datetime.now(ist)
        time_str = now_ist.strftime("%H:%M:%S IST")

        is_weekday = now_ist.weekday() < 5
        is_market_time = (now_ist.time() >= datetime.time(9, 15)) and (now_ist.time() <= datetime.time(15, 30))
        market_status = "OPEN" if (is_weekday and is_market_time) else "CLOSED"

        advdec = get_cached_advdec()
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
        logger.exception("api_header error")
        return {"error": "internal", "trace": traceback.format_exc()}


# ---------- adv/dec background updater ----------
def _simulate_adv_decl(exchange: str = "NSE"):
    global _SIM_TICK_COUNTER
    _SIM_TICK_COUNTER += 1
    if _SIM_TICK_COUNTER % 5 == 0:
        if exchange.upper() == "BSE":
            adv = random.randint(1500, 2500)
            dec = random.randint(1000, 2000)
        else:
            adv = random.randint(800, 1500)
            dec = random.randint(400, 1000)
        return {"adv": adv, "dec": dec}
    return {"adv": int(_ADVDEC_CACHE.get("adv", 1520)), "dec": int(_ADVDEC_CACHE.get("dec", 720))}


def compute_adv_decl_from_csv_or_yf(exchange: str = "NSE", sample_limit: int = 800) -> Dict[str, int]:
    adv = 0
    dec = 0
    used_csv = 0
    files = list_tickers(exchange)
    folder = get_data_folder(exchange)
    if files and folder:
        for entry in files[:sample_limit]:
            fname = entry["file"]
            path = os.path.join(folder, f"{fname.replace('.', '_')}.csv")
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

    if yf is None:
        return {"adv": adv, "dec": dec}

    symbols = [e["file"] for e in files[:sample_limit]] if files else []
    if not symbols:
        return {"adv": adv, "dec": dec}

    try:
        ticker_str = " ".join(symbols)
        df = None
        try:
            df = yf.download(tickers=ticker_str, period="5d", interval="1d", group_by="ticker", threads=True, progress=False)
        except Exception:
            try:
                df = yf.download(tickers=ticker_str, period="7d", interval="60m", group_by="ticker", threads=True, progress=False)
            except Exception as e:
                logger.exception("advdec yfinance batch failed: %s", e)
                df = None
        if df is None or df.empty:
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

        checked = 0
        if hasattr(df.columns, "levels") and len(df.columns.levels) >= 2:
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
                if checked >= sample_limit:
                    break
            return {"adv": adv, "dec": dec}
        else:
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
    except Exception as e:
        logger.exception("compute_adv_decl_from_csv_or_yf failed: %s", e)
        return {"adv": adv, "dec": dec}


def advdec_updater(loop_delay: int = 15, exchange: str = "NSE", sample_limit: int = 800):
    """
    Blocking function to be run in background thread or asyncio task.
    Periodically computes adv/dec and stores in _ADVDEC_CACHE.
    """
    logger.info("Starting adv/dec background updater (delay=%ss)", loop_delay)
    try:
        while True:
            try:
                res = compute_adv_decl_from_csv_or_yf(exchange=exchange, sample_limit=sample_limit)
                _ADVDEC_CACHE["adv"] = int(res.get("adv", 0))
                _ADVDEC_CACHE["dec"] = int(res.get("dec", 0))
                _ADVDEC_CACHE["ts"] = int(time.time())
            except Exception as e:
                logger.exception("advdec_updater cycle error: %s", e)
            time.sleep(loop_delay)
    except Exception as e:
        logger.exception("advdec_updater terminated: %s", e)


def get_cached_advdec() -> Dict[str, int]:
    """Return cached adv/dec (may be stale if not yet computed)"""
    return {"adv": int(_ADVDEC_CACHE.get("adv", 0)),
            "dec": int(_ADVDEC_CACHE.get("dec", 0)),
            "ts": int(_ADVDEC_CACHE.get("ts", 0))}


# ---------------- ticker resolution & api_stock (robust) ----------------
def _normalize_query(q: str) -> str:
    return (q or "").strip().upper()


def _try_variants_for_file_ticker(q: str, exchange: str):
    q0 = _normalize_query(q)
    if "." in q0 or "_" in q0:
        yield q0.replace("_", ".")
    ex = (exchange or "NSE").upper()
    if ex == "NSE":
        yield f"{q0}.NS"
    elif ex == "BSE":
        yield f"{q0}.BO"
    yield q0


def _resolve_to_file_ticker(query: str, exchange: str = "NSE") -> Optional[str]:
    """
    Tolerant resolution:
    - checks list_tickers() display names and file names,
    - tries common filename variants and case-insensitive matches in the data folder.
    """
    if not query:
        return None
    q = _normalize_query(query)
    candidates = list_tickers(exchange)
    file_map = {c["file"].upper(): c["file"] for c in candidates}
    display_map = {c["display"].upper(): c["file"] for c in candidates}

    # try variants
    for variant in _try_variants_for_file_ticker(q, exchange):
        if variant in file_map:
            logger.info("_resolve_to_file_ticker: variant %s -> %s", variant, file_map[variant])
            return file_map[variant]
        base = variant.split(".")[0]
        if base in display_map:
            logger.info("_resolve_to_file_ticker: base %s -> %s", base, display_map[base])
            return display_map[base]

    # exact display
    if q in display_map:
        logger.info("_resolve_to_file_ticker: display exact %s -> %s", q, display_map[q])
        return display_map[q]

    # partial match
    for disp, file in display_map.items():
        if disp.startswith(q) or q in disp:
            logger.info("_resolve_to_file_ticker: partial %s -> %s (display %s)", q, file, disp)
            return file

    # case-insensitive filename search in folder
    folder = get_data_folder(exchange)
    if folder:
        want = [v for v in _try_variants_for_file_ticker(q, exchange)]
        files = os.listdir(folder)
        lower_map = {f.lower(): f for f in files}
        for v in want:
            candidate_fname = f"{v.replace('.', '_')}.csv".lower()
            if candidate_fname in lower_map:
                real = lower_map[candidate_fname]
                resolved = os.path.splitext(real)[0].replace("_", ".")
                logger.info("_resolve_to_file_ticker: case-insensitive match %s -> %s", real, resolved)
                return resolved

    logger.info("_resolve_to_file_ticker: no match for '%s' exchange '%s'", q, exchange)
    return None


@router.get("/api/stock")
def api_stock(query: str, exchange: str = "NSE"):
    """
    Resolve a search query to a file and return its historical CSV as JSON.
    Returns clear 404 reasons when not found.
    """
    try:
        logger.info("api_stock: query=%s exchange=%s", query, exchange)
        file_ticker = _resolve_to_file_ticker(query, exchange)
        if not file_ticker:
            candidates = list_tickers(exchange)[:50]
            return JSONResponse(status_code=404, content={"error": "ticker_not_found", "query": query, "exchange": exchange, "candidates": candidates})

        filename = f"{file_ticker.replace('.', '_')}.csv"
        folder = get_data_folder(exchange)
        if not folder:
            return JSONResponse(status_code=404, content={"error": "data_folder_not_found", "exchange": exchange})

        path = os.path.join(folder, filename)
        if not os.path.exists(path):
            found = None
            if os.path.isdir(folder):
                for f in os.listdir(folder):
                    if f.lower() == filename.lower():
                        found = os.path.join(folder, f)
                        break
            if not found:
                logger.info("api_stock: resolved file not found: %s expected at %s", filename, path)
                return JSONResponse(status_code=404, content={"error": "file_not_found", "file": filename, "resolved_file_ticker": file_ticker, "search_folder": folder})
            path = found

        rows = _safe_read_csv_rows(path)
        if not rows:
            logger.info("api_stock: file found but no rows or parse error: %s", path)
            return JSONResponse(status_code=404, content={"error": "empty_file_or_parse_error", "file": os.path.basename(path)})

        return {"file": file_ticker, "symbol": file_ticker.split(".")[0], "exchange": exchange, "data": rows}
    except Exception:
        logger.exception("api_stock: internal error for query=%s exchange=%s", query, exchange)
        return JSONResponse(status_code=500, content={"error": "internal", "trace": traceback.format_exc()})
