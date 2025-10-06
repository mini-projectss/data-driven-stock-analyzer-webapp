# datatable_api.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pathlib import Path
import os
import csv
import datetime
import logging
from typing import List, Dict, Optional
from header_api import get_data_folder, list_tickers, _safe_read_csv_rows

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/api/datatable")
def api_datatable(exchange: str = "NSE", date: Optional[str] = None):
    """
    Return market data table for the given exchange and optional date.
    - Reads all CSVs from data/historical/<exchange>
    - Extracts rows for the given date (or latest available)
    """
    try:
        folder = get_data_folder(exchange)
        if not folder:
            return JSONResponse(status_code=404, content={"error": "data_folder_not_found", "exchange": exchange})

        tickers = list_tickers(exchange)
        if not tickers:
            return JSONResponse(status_code=404, content={"error": "no_tickers_found", "exchange": exchange})

        # Normalize date
        target_date = None
        if date:
            try:
                target_date = datetime.datetime.strptime(date, "%Y-%m-%d").date()
            except Exception:
                pass

        table_rows = []
        for t in tickers:
            file_ticker = t["file"]
            path = os.path.join(folder, f"{file_ticker.replace('.', '_')}.csv")
            rows = _safe_read_csv_rows(path)
            if not rows:
                continue

            # Find last available row or by date
            row = None
            if target_date:
                for r in reversed(rows):
                    try:
                        if datetime.datetime.strptime(r["date"], "%Y-%m-%d").date() == target_date:
                            row = r
                            break
                    except Exception:
                        continue
            if not row:
                row = rows[-1]  # fallback to latest row

            if not row or not row.get("close"):
                continue

            high = row.get("high") or 0
            low = row.get("low") or 0
            vol = row.get("volume") or 0
            close = row.get("close") or 0

            # Determine % change from previous close if available
            change_pct = 0
            if len(rows) >= 2:
                try:
                    prev_close = rows[-2]["close"]
                    if prev_close:
                        change_pct = ((close - prev_close) / prev_close) * 100
                except Exception:
                    pass

            table_rows.append({
                "instrument": t["display"],
                "volume": vol,
                "high": high,
                "low": low,
                "change": round(change_pct, 2)
            })

        if not table_rows:
            return JSONResponse(status_code=404, content={"error": "no_data_for_date", "date": date})

        # Change "data" to "items" for frontend compatibility
        return {"exchange": exchange, "date": date or "latest", "items": table_rows}
    except Exception as e:
        logger.exception("api_datatable error: %s", e)
        return JSONResponse(status_code=500, content={"error": "internal", "trace": str(e)})
