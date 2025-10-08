# political_api.py
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import os
import csv
import logging
import time
import datetime
from typing import Optional, List, Dict, Any

router = APIRouter()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Path detection: look for files placed in repo root with "CF-Insider" prefix or containing "Insider"
CSV_CANDIDATE_PREFIX = "CF-Insider"
CSV_SEARCH_TOKEN = "Insider"

# Simple in-memory cache to avoid re-parsing on every request (short TTL)
_CACHE: Dict[str, Any] = {"ts": 0, "items": [], "file": None}
CACHE_TTL = 5  # seconds - small during development; increase if needed


def find_insider_csv() -> Optional[str]:
    """
    Find a local CSV present in the current working directory (or parent)
    that matches the expected file pattern. Returns absolute path or None.
    """
    cwd = os.getcwd()
    candidates = []

    # common places to check
    search_paths = [
        cwd,
        os.path.join(cwd, ".."),
        os.path.join(cwd, "..", ".."),
    ]

    # user said file will be in project root, so also check repo root itself
    for base in search_paths:
        try:
            for fn in os.listdir(base):
                if fn.startswith(CSV_CANDIDATE_PREFIX) or CSV_SEARCH_TOKEN.lower() in fn.lower():
                    if fn.lower().endswith(".csv"):
                        candidates.append(os.path.join(base, fn))
        except Exception:
            continue

    # prefer exact prefix match if present (sorted by name newest-ish)
    if not candidates:
        return None
    # sort by mtime descending
    candidates = sorted(candidates, key=lambda p: os.path.getmtime(p), reverse=True)
    return candidates[0]


def _normalize_header(h: str) -> str:
    # strip quotes, whitespace, and normalize spacing/uppercase
    return h.strip().strip('"').strip().upper().replace("\n", " ").replace("\r", "")


def _parse_int(s):
    try:
        if s is None or s == "":
            return 0
        # remove commas
        return int(float(str(s).replace(",", "").strip()))
    except Exception:
        try:
            return int(float(str(s).split()[0].replace(",", "")))
        except Exception:
            return 0


def _parse_float(s):
    try:
        if s is None or s == "":
            return 0.0
        return float(str(s).replace(",", "").strip())
    except Exception:
        return 0.0


def _normalize_date(d: Optional[str]) -> Optional[str]:
    """
    Normalize various date formats to YYYY-MM-DD (strings).
    CSV uses formats like 07-Oct-2025 or '07-Oct-2025 17:25'. Also try ISO.
    """
    if not d:
        return None
    d = d.strip()
    # if includes time, split
    if " " in d and "-" in d:
        d = d.split()[0]
    # try known format: 07-Oct-2025
    for fmt in ("%d-%b-%Y", "%d-%B-%Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            parsed = datetime.datetime.strptime(d, fmt).date()
            return parsed.isoformat()
        except Exception:
            pass
    # try to parse ISO-like
    try:
        # allow datetime strings
        parsed = datetime.date.fromisoformat(d.split()[0])
        return parsed.isoformat()
    except Exception:
        return None


def _map_category(cat: Optional[str]) -> str:
    if not cat:
        return "Unknown"
    c = cat.strip().lower()
    if "promot" in c:
        return "Promoter"
    if "promoter" in c:
        return "Promoter"
    if "polit" in c or "minister" in c or "mp" in c or "mla" in c:
        return "Politician"
    # some rows have 'NA' or '-' etc.
    return "Unknown"


def _map_action(action_raw: Optional[str]) -> str:
    if not action_raw:
        return "BUY"
    a = action_raw.strip().lower()
    if "sell" in a:
        return "SELL"
    if "buy" in a or "acquir" in a:
        return "BUY"
    return a.upper()


def read_insider_csv(path: str) -> List[Dict]:
    """
    Parse the NSE CSV and return normalized list of dicts.
    Each dict matches the PoliticalTrade shape frontend expects.
    """
    out: List[Dict] = []
    if not os.path.exists(path):
        return out

    # The CSV has a malformed header with newlines inside quotes.
    # We need to manually find, clean, and parse the header.
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    # Find the start of the header
    header_idx = -1
    for i, line in enumerate(lines):
        if "SYMBOL" in line.upper():
            header_idx = i
            break

    if header_idx == -1:
        logger.error("Could not find header row with 'SYMBOL' in CSV.")
        return out

    # Read until the full header is constructed (ends with XBRL)
    header_str = ""
    data_start_idx = header_idx
    for i in range(header_idx, len(lines)):
        header_str += lines[i]
        data_start_idx = i + 1
        if "XBRL" in lines[i].upper():
            break

    cleaned_header = [_normalize_header(h) for h in header_str.split(',')]
    reader = csv.DictReader(lines[data_start_idx:], fieldnames=cleaned_header)

    # normalize field names (keys) map to simplified canonical names
    canonical_map = {}
    for k in reader.fieldnames or []:
        kn = _normalize_header(k or "")
        canonical_map[kn] = k  # canonical -> original

    # helper to get field value by canonical part-match
    def get_by_keyword(row, keywords):
        for canon, orig in canonical_map.items():
            for kw in keywords:
                if kw.upper() in canon:
                    return row.get(orig, "").strip()
        return ""

    idx = 0
    for row in reader:
        idx += 1
        try:
            symbol_raw = get_by_keyword(row, ["SYMBOL"])
            symbol = symbol_raw.strip().strip('"')
            company = get_by_keyword(row, ["COMPANY", "NAME OF THE COMPANY", "SECURITY NAME"])
            acquirer = get_by_keyword(row, ["NAME OF THE ACQUIRER", "NAME OF THE ACQUIRER/DISPOSER", "OWNER", "NAME OF PERSON", "ACQUIRER/DISPOSER NAME"])
            cat_raw = get_by_keyword(row, ["CATEGORY OF PERSON", "CATEGORY"])
            category = _map_category(cat_raw)
            tx_type = get_by_keyword(row, ["ACQUISITION/DISPOSAL TRANSACTION TYPE", "TRANSACTION TYPE", "ACQUISITION", "DISPOSAL"])
            # there might be an explicit BUY/SELL column in some files - also check "ACQUISITION/DISPOSAL"
            buy_sell = get_by_keyword(row, ["ACQUISITION/DISPOSAL TRANSACTION TYPE", "TRANSACTION TYPE"])
            # number of securities acquired/disclosed
            qty_raw = get_by_keyword(row, ["NO. OF SECURITIES (ACQUIRED/DISCLOSED)", "NO. OF SECURITY (ACQUIRED/DISCLOSED)", "NO. OF SECURITIES", "NO. OF SECURITY (ACQUIRED/DISCLOSED)", "QUANTITY"])
            if not qty_raw:
                # sometimes the value is in column "NO. OF SECURITY (POST)" etc. try numeric fields
                qty_raw = get_by_keyword(row, ["NO. OF SECURITY (POST)", "NO. OF SECURITY (PRIOR)"])
            qty = _parse_int(qty_raw)

            value_raw = get_by_keyword(row, ["VALUE OF SECURITY", "VALUE OF SECURITY (ACQUIRED/DISCLOSED)", "VALUE", "TOTAL VALUE"])
            value = _parse_float(value_raw)

            # date: prefer "DATE OF ALLOTMENT/ACQUISITION FROM", else "DATE OF INITMATION TO COMPANY", else broadcast datetime
            date_from = get_by_keyword(row, ["DATE OF ALLOTMENT/ACQUISITION FROM", "DATE OF ALLOTMENT/ACQUISITION", "DATE OF ALLOTMENT"])
            date_init = get_by_keyword(row, ["DATE OF INITMATION TO COMPANY", "DATE OF INITMATION"])
            broadcast = get_by_keyword(row, ["BROADCASTE DATE AND TIME", "BROADCAST DATE AND TIME", "BROADCAST DATE"])
            tx_date = _normalize_date(date_from) or _normalize_date(date_init) or _normalize_date(broadcast)

            exchange_raw = get_by_keyword(row, ["EXCHANGE"])
            exchange = "NSE" if "NSE" in exchange_raw.upper() else ("BSE" if "BSE" in exchange_raw.upper() else "NSE")

            # action: if a 'Sell' word appears in transaction type or in the "ACQUISITION/DISPOSAL" column, honor it
            action = _map_action(get_by_keyword(row, ["MODE OF ACQUISITION", "ACQUISITION/DISPOSAL TRANSACTION TYPE", "ACQUISITION/DISPOSAL", "ACQUISITION", "DISPOSAL"]) or tx_type or buy_sell)

            # compute price per share if possible
            price_per_share = 0.0
            if qty and value:
                try:
                    price_per_share = round(float(value) / float(qty), 2)
                except Exception:
                    price_per_share = 0.0

            # Try to produce human-friendly stock name
            stock_name = company or symbol

            norm = {
                "id": f"{symbol or 'UNK'}::{idx}::{int(time.time()*1000)}",
                "personName": acquirer or "",
                "category": category,  # 'Promoter'/'Politician'/'Unknown'
                "action": action,
                "stockSymbol": symbol or "",
                "stockName": stock_name or "",
                "quantity": qty,
                "value": value,
                "pricePerShare": price_per_share,
                "transactionDate": tx_date or (datetime.date.today().isoformat()),
                "exchange": exchange,
                "portfolioImpact": ""
            }
            out.append(norm)
        except Exception as e:
            logger.exception("Failed to parse row: %s", e)
            continue

    return out


def load_trades_from_csv(force_reload: bool = False) -> List[Dict]:
    """
    Load trades list from CSV, cache for CACHE_TTL seconds.
    """
    now = time.time()
    if not force_reload and _CACHE.get("items") and now - _CACHE.get("ts", 0) < CACHE_TTL:
        return _CACHE["items"]

    path = find_insider_csv()
    if not path:
        _CACHE.update({"ts": now, "items": [], "file": None})
        return []

    try:
        items = read_insider_csv(path)
        _CACHE.update({"ts": now, "items": items, "file": path})
        logger.info("Loaded %d trades from %s", len(items), path)
        return items
    except Exception as e:
        logger.exception("Error loading CSV %s: %s", path, e)
        _CACHE.update({"ts": now, "items": [], "file": path})
        return []


def _filter_trades(trades: List[Dict], exchange: str, start_date: Optional[str], end_date: Optional[str], category: Optional[str], search: Optional[str]) -> List[Dict]:
    def to_date(dstr):
        try:
            return datetime.date.fromisoformat(dstr)
        except Exception:
            return None

    sd = to_date(start_date) if start_date else None
    ed = to_date(end_date) if end_date else None
    q = (search or "").strip().lower()

    out = []
    for t in trades:
        # exchange filter
        if exchange and t.get("exchange", "").upper() != exchange.upper():
            continue
        # category filter
        if category and category != "All" and t.get("category") != category:
            continue
        # date filter
        td = None
        try:
            td = to_date(t.get("transactionDate"))
        except Exception:
            td = None
        if sd and td and td < sd:
            continue
        if ed and td and td > ed:
            continue
        # search filter
        if q:
            combined = " ".join([
                str(t.get("personName", "")),
                str(t.get("stockSymbol", "")),
                str(t.get("stockName", ""))
            ]).lower()
            if q not in combined:
                continue
        out.append(t)
    return out


@router.get("/api/political/trades")
def api_political_trades(
    exchange: str = Query("NSE"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(200)
):
    """
    Serve political/insider trades from a local NSE CSV file.
    Query params:
      - exchange: NSE or BSE
      - start_date / end_date: ISO yyyy-mm-dd
      - category: 'Politician' or 'Promoter' or 'All'
      - search: text match for person/stock
      - limit: max items
    """
    # ensure CSV exists
    path = find_insider_csv()
    if not path:
        return JSONResponse(status_code=404, content={"error": "csv_not_found", "message": "No insider CSV found. Place the downloaded CSV (e.g. CF-Insider-...) in the project root."})

    try:
        trades = load_trades_from_csv()
        if trades is None:
            trades = []
        filtered = _filter_trades(trades, exchange or "NSE", start_date, end_date, category, search)
        # sort by transactionDate desc (most recent first)
        try:
            filtered = sorted(filtered, key=lambda t: t.get("transactionDate") or "", reverse=True)
        except Exception:
            pass
        truncated = filtered[: max(0, int(limit or 200))]
        return {"items": truncated}
    except Exception as e:
        logger.exception("api_political_trades error: %s", e)
        return JSONResponse(status_code=500, content={"error": "internal", "trace": str(e)})
