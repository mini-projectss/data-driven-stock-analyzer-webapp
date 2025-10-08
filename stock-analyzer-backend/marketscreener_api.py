# marketscreener_api.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pathlib import Path
import os
import csv
import datetime
import logging
from typing import List, Dict, Optional
import glob

logger = logging.getLogger(__name__)
router = APIRouter()

def get_predictions_folder() -> str:
    """Get the path to the predictions folder."""
    base_dir = Path(__file__).parent.parent
    return str(base_dir / "data" / "predictions")

@router.get("/api/marketscreener")
def api_marketscreener(
    exchange: str = "all",
    date: Optional[str] = None,
    trend: str = "all",
    ohlc: str = "close"  # open, high, low, close
):
    """
    Return market screener data from prediction CSVs.
    - Reads all CSVs from data/predictions/
    - Filters by exchange, date, trend
    - Returns latest predictions or by date
    """
    try:
        folder = get_predictions_folder()
        if not os.path.exists(folder):
            return JSONResponse(status_code=404, content={"error": "predictions_folder_not_found"})

        # Get all prediction CSV files
        pattern = os.path.join(folder, "*_prediction.csv")
        csv_files = glob.glob(pattern)

        if not csv_files:
            return JSONResponse(status_code=404, content={"error": "no_prediction_files_found"})

        # Normalize date
        target_date = None
        if date and date != "latest":
            try:
                target_date = datetime.datetime.strptime(date, "%Y-%m-%d").date()
            except Exception:
                pass

        screener_rows = []

        for csv_file in csv_files:
            filename = os.path.basename(csv_file)
            # Parse filename: SYMBOL_EXCHANGE_prediction.csv
            parts = filename.replace("_prediction.csv", "").split("_")
            if len(parts) != 2:
                continue

            symbol = parts[0]
            file_exchange = parts[1].upper()  # NSE or BO (BSE)

            # Map BO to BSE
            display_exchange = "BSE" if file_exchange == "BO" else file_exchange

            # Filter by exchange
            if exchange != "all" and display_exchange != exchange.upper():
                continue

            try:
                with open(csv_file, 'r', newline='', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    rows = list(reader)

                if not rows:
                    continue

                # Find target row
                row = None
                if target_date:
                    for r in rows:
                        try:
                            row_date = datetime.datetime.strptime(r["Date"], "%Y-%m-%d").date()
                            if row_date == target_date:
                                row = r
                                break
                        except Exception:
                            continue
                if not row:
                    # Get latest (first future date)
                    row = rows[0]

                if not row:
                    continue

                # Extract prediction data
                prophet_open = float(row.get("Prophet_Open", 0) or 0)
                prophet_high = float(row.get("Prophet_High", 0) or 0)
                prophet_low = float(row.get("Prophet_Low", 0) or 0)
                prophet_close = float(row.get("Prophet_Close", 0) or 0)

                lgbm_open = float(row.get("LGBM_Open", 0) or 0)
                lgbm_high = float(row.get("LGBM_High", 0) or 0)
                lgbm_low = float(row.get("LGBM_Low", 0) or 0)
                lgbm_close = float(row.get("LGBM_Close", 0) or 0)

                # Get selected OHLC value from Prophet as the primary display value
                if ohlc == "open":
                    selected_value = prophet_open
                elif ohlc == "high":
                    selected_value = prophet_high
                elif ohlc == "low":
                    selected_value = prophet_low
                else:  # close
                    selected_value = prophet_close

                # Calculate trend (simplified: based on prophet vs lgbm agreement)
                prophet_change = prophet_close - prophet_open if prophet_open else 0
                lgbm_change = lgbm_close - lgbm_open if lgbm_open else 0

                # Determine trend
                if prophet_change > 0 and lgbm_change > 0:
                    trend_calc = "bullish"
                elif prophet_change < 0 and lgbm_change < 0:
                    trend_calc = "bearish"
                else:
                    trend_calc = "neutral"

                # Filter by trend
                if trend != "all" and trend_calc != trend.lower():
                    continue

                # Calculate confidence (simplified: based on model agreement)
                if prophet_close and lgbm_close:
                    diff_pct = abs(prophet_close - lgbm_close) / ((prophet_close + lgbm_close) / 2) * 100
                    confidence = max(50, 100 - diff_pct * 2)  # Higher agreement = higher confidence
                else:
                    confidence = 75.0

                screener_rows.append({
                    "symbol": symbol,
                    "exchange": display_exchange,
                    "date": row["Date"],
                    "prophet_open": round(prophet_open, 2),
                    "prophet_high": round(prophet_high, 2),
                    "prophet_low": round(prophet_low, 2),
                    "prophet_close": round(prophet_close, 2),
                    "lgbm_open": round(lgbm_open, 2),
                    "lgbm_high": round(lgbm_high, 2),
                    "lgbm_low": round(lgbm_low, 2),
                    "lgbm_close": round(lgbm_close, 2),
                    "selected_value": round(selected_value, 2),
                    "trend": trend_calc,
                    "confidence": round(confidence, 1)
                })

            except Exception as e:
                logger.warning(f"Error processing {csv_file}: {e}")
                continue

        # Sort by symbol
        screener_rows.sort(key=lambda x: x["symbol"])

        return {
            "exchange": exchange,
            "model": "all", # Kept for compatibility, but not used for filtering
            "date": date or "latest",
            "ohlc": ohlc,
            "trend": trend,
            "items": screener_rows
        }

    except Exception as e:
        logger.exception("api_marketscreener error: %s", e)
        return JSONResponse(status_code=500, content={"error": "internal", "trace": str(e)})

@router.post("/api/watchlist/predictions")
def api_watchlist_predictions(
    symbols: List[str],
    date: Optional[str] = None,
    trend: str = "all",
    ohlc: str = "close"
):
    """
    Return market screener data for a specific list of symbols from prediction CSVs.
    """
    try:
        folder = get_predictions_folder()
        if not os.path.exists(folder):
            return JSONResponse(status_code=404, content={"error": "predictions_folder_not_found"})

        target_date = None
        if date and date != "latest":
            try:
                target_date = datetime.datetime.strptime(date, "%Y-%m-%d").date()
            except Exception:
                pass

        screener_rows = []

        for symbol in symbols:
            # Find the prediction file for the symbol. Assume NSE first, then BSE.
            # This logic might need to be more robust if symbols are not unique across exchanges.
            # For now, we'll check for both NSE and BSE files.
            potential_files = [
                os.path.join(folder, f"{symbol}_NSE_prediction.csv"),
                os.path.join(folder, f"{symbol}_BO_prediction.csv")
            ]
            
            csv_file = None
            for f in potential_files:
                if os.path.exists(f):
                    csv_file = f
                    break
            
            if not csv_file:
                continue

            filename = os.path.basename(csv_file)
            parts = filename.replace("_prediction.csv", "").split("_")
            file_exchange = parts[1].upper()
            display_exchange = "BSE" if file_exchange == "BO" else file_exchange

            with open(csv_file, 'r', newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                rows = list(reader)

            if not rows:
                continue

            row = rows[0] # Get latest prediction

            prophet_open = float(row.get("Prophet_Open", 0) or 0)
            prophet_close = float(row.get("Prophet_Close", 0) or 0)
            lgbm_open = float(row.get("LGBM_Open", 0) or 0)
            lgbm_close = float(row.get("LGBM_Close", 0) or 0)

            if prophet_change > 0 and lgbm_change > 0:
                trend_calc = "bullish"
            elif prophet_change < 0 and lgbm_change < 0:
                trend_calc = "bearish"
            else:
                trend_calc = "neutral"

            if trend != "all" and trend_calc != trend.lower():
                continue

            # This re-uses logic from the main screener. Consider refactoring into a shared function.
            # For brevity, it's duplicated here.
            screener_rows.append({
                "symbol": symbol,
                "exchange": display_exchange,
                "date": row["Date"],
                "prophet_open": round(float(row.get("Prophet_Open", 0) or 0), 2),
                "prophet_high": round(float(row.get("Prophet_High", 0) or 0), 2),
                "prophet_low": round(float(row.get("Prophet_Low", 0) or 0), 2),
                "prophet_close": round(float(row.get("Prophet_Close", 0) or 0), 2),
                "lgbm_open": round(float(row.get("LGBM_Open", 0) or 0), 2),
                "lgbm_high": round(float(row.get("LGBM_High", 0) or 0), 2),
                "lgbm_low": round(float(row.get("LGBM_Low", 0) or 0), 2),
                "lgbm_close": round(float(row.get("LGBM_Close", 0) or 0), 2),
                "selected_value": round(float(row.get(f"Prophet_{ohlc.capitalize()}", 0) or 0), 2),
                "trend": trend_calc,
                "confidence": round(float(row.get("Confidence", 75.0) or 75.0), 1)
            })

        screener_rows.sort(key=lambda x: x["symbol"])
        return {"items": screener_rows}

    except Exception as e:
        logger.exception("api_watchlist_predictions error: %s", e)
        return JSONResponse(status_code=500, content={"error": "internal", "trace": str(e)})
