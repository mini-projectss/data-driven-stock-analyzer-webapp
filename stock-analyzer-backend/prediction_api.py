from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import os
import pandas as pd
import numpy as np
import traceback
import time
from typing import Optional, List, Dict

try:
    from prophet import Prophet
except Exception:
    Prophet = None
try:
    import lightgbm as lgb
    from sklearn.multioutput import MultiOutputRegressor
except Exception:
    lgb = None
    MultiOutputRegressor = None
try:
    import yfinance as yf
except Exception:
    yf = None

router = APIRouter()

PREDICTIONS_PATH = os.path.join('data', 'temp', 'predictions')
PROCESSED_LGBM_PATH = os.path.join('data', 'processed', 'lightgbm')
PROCESSED_PROPHET_PATH = os.path.join('data', 'processed', 'prophet')
os.makedirs(PREDICTIONS_PATH, exist_ok=True)

def get_csv_path(ticker: str, exchange: str) -> Optional[str]:
    suffix = 'BO' if exchange.upper() == 'BSE' else 'NS'
    folder = os.path.join('data', 'historical', exchange.upper())
    fname = f"{ticker}_{suffix}.csv"
    path = os.path.join(folder, fname)
    return path if os.path.exists(path) else None

def load_preprocessed_lgbm(ticker: str, exchange: str) -> Optional[pd.DataFrame]:
    suffix = 'BO' if exchange.upper() == 'BSE' else 'NS'
    fname = f"{ticker}_{suffix}.csv"
    path = os.path.join(PROCESSED_LGBM_PATH, fname)
    if os.path.exists(path):
        df = pd.read_csv(path, parse_dates=['Date'])
        df = df.set_index('Date')
        for col in ['Open','High','Low','Close']:
            if col not in df.columns:
                df[col] = np.nan
        df = df[['Open','High','Low','Close']].dropna()
        return df
    return None

def load_preprocessed_prophet(ticker: str, exchange: str) -> Optional[pd.DataFrame]:
    suffix = 'BO' if exchange.upper() == 'BSE' else 'NS'
    dfs = {}
    for col in ['open', 'high', 'low', 'close']:
        fname = f"{ticker}_{suffix}_{col}.csv"
        path = os.path.join(PROCESSED_PROPHET_PATH, fname)
        if not os.path.exists(path):
            return None
        df = pd.read_csv(path, parse_dates=['Date'])
        df = df.set_index('Date')
        dfs[col] = df.rename(columns={df.columns[-1]: col.capitalize()})[col.capitalize()]
    # Combine all columns into one DataFrame
    prophet_df = pd.concat(dfs.values(), axis=1)
    prophet_df = prophet_df[['Open', 'High', 'Low', 'Close']]
    return prophet_df

def load_historical_data(ticker: str, exchange: str, period: str, interval: str) -> pd.DataFrame:
    # Only for hours/minutes: fetch from yfinance
    if yf is None:
        raise RuntimeError("yfinance not available")
    suffix = 'BO' if exchange.upper() == 'BSE' else 'NS'
    # Avoid double suffix
    yf_ticker = ticker if ticker.endswith(f".{suffix}") else f"{ticker}.{suffix}"
    df = yf.download(yf_ticker, period=period, interval=interval, progress=False, auto_adjust=True)
    if df.empty:
        raise ValueError(f"No data for {yf_ticker}")
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [c[0] for c in df.columns]
    for col in ['Open','High','Low','Close']:
        if col not in df.columns:
            df[col] = np.nan
    df = df[['Open','High','Low','Close']].dropna()
    df.index.name = 'date'
    return df

def prophet_predict(df: pd.DataFrame, periods: int, freq: str) -> pd.DataFrame:
    if Prophet is None:
        raise RuntimeError("Prophet not available")
    df_prop = df[['Close']].reset_index()
    df_prop.columns = ['ds','y']
    df_prop['ds'] = pd.to_datetime(df_prop['ds'])
    model = Prophet(
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10.0,
        weekly_seasonality=(freq == 'D'),
        daily_seasonality=(freq in ['h', 'min']),
        yearly_seasonality=False
    )
    model.fit(df_prop)
    future = model.make_future_dataframe(periods=periods, freq=freq, include_history=False)
    forecast = model.predict(future)
    preds = forecast[['ds','yhat']].set_index('ds')
    pred_close = preds['yhat'].values
    volatility = 0.02
    pred_high = pred_close * (1 + np.random.uniform(volatility/2, volatility, len(pred_close)))
    pred_low = pred_close * (1 - np.random.uniform(volatility/2, volatility, len(pred_close)))
    pred_open = pred_close * (1 + np.random.uniform(-volatility/2, volatility/2, len(pred_close)))
    out = pd.DataFrame({
        'Open': pred_open,
        'High': pred_high,
        'Low': pred_low,
        'Close': pred_close
    }, index=preds.index)
    out.index.name = 'date'
    return out

def lightgbm_predict(df: pd.DataFrame, periods: int, freq: str) -> pd.DataFrame:
    if lgb is None or MultiOutputRegressor is None:
        raise RuntimeError("LightGBM not available")
    df_l = df.copy()
    df_l['MA_7_Close'] = df_l['Close'].rolling(window=min(7, len(df_l)), min_periods=1).mean()
    df_l['MA_30_Close'] = df_l['Close'].rolling(window=min(30, len(df_l)), min_periods=1).mean()
    df_l['Lag_1_Close'] = df_l['Close'].shift(1)
    df_l = df_l.ffill().bfill()
    features = ['MA_7_Close', 'MA_30_Close', 'Lag_1_Close']
    targets = ['Open','High','Low','Close']
    X = df_l[features]
    y = df_l[targets]
    valid_mask = ~(X.isna().any(axis=1) | y.isna().any(axis=1))
    X = X[valid_mask]
    y = y[valid_mask]
    if len(X) < 5:
        raise ValueError("Not enough valid data for LightGBM")
    model = MultiOutputRegressor(
        lgb.LGBMRegressor(
            n_estimators=50,
            learning_rate=0.1,
            verbosity=-1,
            random_state=42
        )
    )
    model.fit(X, y)
    predictions = []
    last_known = df_l.copy()
    delta_map = {'D': pd.Timedelta(days=1), 'h': pd.Timedelta(hours=1), 'min': pd.Timedelta(minutes=1)}
    delta = delta_map.get(freq, pd.Timedelta(days=1))
    for i in range(periods):
        current_features = pd.DataFrame({
            'MA_7_Close': [last_known['Close'].iloc[-7:].mean()],
            'MA_30_Close': [last_known['Close'].iloc[-30:].mean()],
            'Lag_1_Close': [last_known['Close'].iloc[-1]]
        })
        current_features = current_features.ffill().bfill()
        pred = model.predict(current_features)[0]
        predictions.append(pred)
        next_idx = last_known.index[-1] + delta
        new_row = pd.DataFrame({
            'Open': [pred[0]], 'High': [pred[1]], 'Low': [pred[2]], 'Close': [pred[3]]
        }, index=[next_idx])
        last_known = pd.concat([last_known, new_row])
    future_idx = pd.date_range(start=df.index[-1] + delta, periods=periods, freq=freq)
    result_df = pd.DataFrame(predictions, index=future_idx, columns=targets)
    result_df.index.name = 'date'
    return result_df

def save_prediction_csv(ticker, exchange, historical_df, prophet_df, lgbm_df):
    historical_df.index = pd.to_datetime(historical_df.index)
    prophet_df.index = pd.to_datetime(prophet_df.index)
    lgbm_df.index = pd.to_datetime(lgbm_df.index)
    hist_renamed = historical_df.rename(columns=lambda c: f"Actual_{c}")
    future_data = []
    if not prophet_df.empty:
        for date, row in prophet_df.iterrows():
            future_data.append({
                'Date': date,
                'Prophet_Close': row['Close']
            })
    if not lgbm_df.empty:
        for date, row in lgbm_df.iterrows():
            future_row = {
                'Date': date,
                'LGBM_Open': row['Open'],
                'LGBM_High': row['High'],
                'LGBM_Low': row['Low'],
                'LGBM_Close': row['Close']
            }
            existing_idx = None
            for i, fd in enumerate(future_data):
                if fd['Date'] == date:
                    existing_idx = i
                    break
            if existing_idx is not None:
                future_data[existing_idx].update(future_row)
            else:
                future_data.append(future_row)
    historical_out = hist_renamed.reset_index().rename(columns={'index': 'Date'})
    future_out = pd.DataFrame(future_data)
    if not historical_out.empty and not future_out.empty:
        combined_out = pd.concat([historical_out, future_out], ignore_index=True)
        combined_out = combined_out.sort_values('Date')
    elif not historical_out.empty:
        combined_out = historical_out
    else:
        combined_out = future_out
    suffix = 'BO' if exchange.upper() == 'BSE' else 'NS'
    fname = f"{ticker.replace('.', '_')}_{suffix}_prediction.csv"
    combined_out.to_csv(os.path.join(PREDICTIONS_PATH, fname), index=False)

def load_historical_data_any(ticker: str, exchange: str, period: str, interval: str) -> pd.DataFrame:
    """
    Try to load from local CSV (data/historical/<exchange>/<ticker>_<suffix>.csv).
    If not found, fallback to yfinance.
    """
    suffix = 'BO' if exchange.upper() == 'BSE' else 'NS'
    folder = os.path.join('data', 'historical', exchange.upper())
    fname = f"{ticker}_{suffix}.csv"
    path = os.path.join(folder, fname)
    if os.path.exists(path):
        df = pd.read_csv(path, parse_dates=['date'])
        df = df.rename(columns={c: c.capitalize() for c in df.columns})
        df = df.set_index('date')
        for col in ['Open','High','Low','Close']:
            if col not in df.columns:
                df[col] = np.nan
        df = df[['Open','High','Low','Close']].dropna()
        return df
    # fallback to yfinance
    if yf is None:
        raise RuntimeError("yfinance not available")
    yf_ticker = ticker if ticker.endswith(f".{suffix}") else f"{ticker}.{suffix}"
    df = yf.download(yf_ticker, period=period, interval=interval, progress=False, auto_adjust=True)
    if df.empty:
        raise ValueError(f"No data for {yf_ticker}")
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [c[0] for c in df.columns]
    for col in ['Open','High','Low','Close']:
        if col not in df.columns:
            df[col] = np.nan
    df = df[['Open','High','Low','Close']].dropna()
    df.index.name = 'date'
    return df

def normalize_ticker_for_yf(ticker: str, exchange: str) -> str:
    """Remove any .BO/.NS and add correct suffix for yfinance."""
    t = ticker.upper().replace('.BO', '').replace('.NS', '')
    suffix = 'BO' if exchange.upper() == 'BSE' else 'NS'
    return f"{t}.{suffix}"

def load_historical_data_yf(ticker: str, exchange: str, period: str, interval: str) -> pd.DataFrame:
    """Always fetch from yfinance for hours/minutes."""
    if yf is None:
        raise RuntimeError("yfinance not available")
    yf_ticker = normalize_ticker_for_yf(ticker, exchange)
    print(f"[prediction_api] Fetching yfinance data: ticker={ticker}, exchange={exchange}, yf_ticker={yf_ticker}, period={period}, interval={interval}")
    df = yf.download(yf_ticker, period=period, interval=interval, progress=False, auto_adjust=True)
    print(f"[prediction_api] yfinance returned shape: {df.shape} columns: {list(df.columns)}")
    if df.empty:
        raise ValueError(f"No data for {yf_ticker}")
    # --- FIX: Handle MultiIndex columns for single ticker ---
    if isinstance(df.columns, pd.MultiIndex):
        # Only keep columns for the requested ticker
        ticker_suffix = yf_ticker.split('.')[-1]
        # e.g. ('Close', 'ACE.BO')
        wanted = []
        for col in df.columns:
            if isinstance(col, tuple) and len(col) == 2:
                if col[1].upper() == yf_ticker.upper():
                    wanted.append(col)
        if not wanted:
            # fallback: try all columns with correct first level
            wanted = [col for col in df.columns if col[0] in ['Open','High','Low','Close']]
        df = df[wanted]
        # flatten columns
        df.columns = [col[0] for col in df.columns]
    for col in ['Open','High','Low','Close']:
        if col not in df.columns:
            df[col] = np.nan
    df = df[['Open','High','Low','Close']].dropna()
    df.index.name = 'date'
    return df

def df_to_list_sorted(df):
    # Ensure sorted by date and date is ISO string
    df = df.copy()
    df = df.sort_index()
    return [
        {
            "date": idx.isoformat() if hasattr(idx, "isoformat") else str(idx),
            "open": float(row["Open"]),
            "high": float(row["High"]),
            "low": float(row["Low"]),
            "close": float(row["Close"])
        }
        for idx, row in df.iterrows()
    ]

def save_prediction_csv_v2(ticker, exchange, historical_df, prophet_df, lgbm_df, periods, time_range):
    """
    Save CSV with columns: Date, Type, Open, High, Low, Close, Model
    - Historical: last N periods (no overlap with predictions)
    - Prophet: next N periods
    - LightGBM: next N periods
    """
    out_rows = []
    # Only keep the last N periods for historical
    historical_df = historical_df.tail(periods)
    # Prophet and LightGBM: only keep N periods, and ensure no overlap with historical
    prophet_df = prophet_df.head(periods)
    lgbm_df = lgbm_df.head(periods)
    # Historical
    for idx, row in historical_df.iterrows():
        out_rows.append({
            "Date": idx,
            "Type": "Historical",
            "Open": row["Open"],
            "High": row["High"],
            "Low": row["Low"],
            "Close": row["Close"],
            "Model": "Historical"
        })
    # Prophet
    for idx, row in prophet_df.iterrows():
        out_rows.append({
            "Date": idx,
            "Type": "Prediction",
            "Open": row["Open"],
            "High": row["High"],
            "Low": row["Low"],
            "Close": row["Close"],
            "Model": "Prophet"
        })
    # LightGBM
    for idx, row in lgbm_df.iterrows():
        out_rows.append({
            "Date": idx,
            "Type": "Prediction",
            "Open": row["Open"],
            "High": row["High"],
            "Low": row["Low"],
            "Close": row["Close"],
            "Model": "LightGBM"
        })
    df_out = pd.DataFrame(out_rows)
    suffix = 'BO' if exchange.upper() == 'BSE' else 'NS'
    fname = f"{ticker.replace('.', '_')}_{suffix}_prediction.csv"
    df_out.to_csv(os.path.join(PREDICTIONS_PATH, fname), index=False)

@router.get("/api/prediction/analyze")
def api_prediction_analyze(
    ticker: str = Query(..., description="Stock ticker, e.g. RELIANCE"),
    exchange: str = Query("NSE", description="NSE or BSE"),
    time_range: str = Query("days", description="days|hours|minutes")
):
    """
    Run prediction for a ticker/exchange/time_range.
    Returns: { historical: [...], prophet: [...], lgbm: [...], error?: str, details?: str }
    """
    try:
        ticker = ticker.replace('.BO','').replace('.NS','').upper()
        debug_info = {
            "ticker": ticker,
            "exchange": exchange,
            "time_range": time_range,
            "step": "",
            "yf_ticker": "",
            "period": "",
            "interval": "",
            "error": "",
        }
        if time_range == "days":
            periods, freq, period, interval = 7, 'D', "2y", "1d"
            debug_info.update({"period": period, "interval": interval})
            lgbm_df = load_preprocessed_lgbm(ticker, exchange)
            prophet_df = load_preprocessed_prophet(ticker, exchange)
            if lgbm_df is None or prophet_df is None:
                debug_info["step"] = "fetch_yfinance_days"
                df = load_historical_data_yf(ticker, exchange, period, interval)
                debug_info["yf_ticker"] = normalize_ticker_for_yf(ticker, exchange)
                if lgbm_df is None:
                    debug_info["step"] = "lightgbm_predict_days"
                    lgbm_df = lightgbm_predict(df, periods, freq)
                if prophet_df is None:
                    debug_info["step"] = "prophet_predict_days"
                    prophet_df = prophet_predict(df, periods, freq)
                historical = df.tail(periods)
            else:
                debug_info["step"] = "preprocessed_days"
                historical = lgbm_df.tail(periods)
        elif time_range == "hours":
            periods, freq, period, interval = 24, 'h', "7d", "1h"
            debug_info.update({"period": period, "interval": interval})
            debug_info["step"] = "fetch_yfinance_hours"
            df = load_historical_data_yf(ticker, exchange, period, interval)
            debug_info["yf_ticker"] = normalize_ticker_for_yf(ticker, exchange)
            historical = df.tail(periods)
            debug_info["step"] = "prophet_predict_hours"
            prophet_df = prophet_predict(df, periods, freq)
            debug_info["step"] = "lightgbm_predict_hours"
            lgbm_df = lightgbm_predict(df, periods, freq)
        elif time_range == "minutes":
            periods, freq, period, interval = 60, 'min', "1d", "1m"
            debug_info.update({"period": period, "interval": interval})
            debug_info["step"] = "fetch_yfinance_minutes"
            df = load_historical_data_yf(ticker, exchange, period, interval)
            debug_info["yf_ticker"] = normalize_ticker_for_yf(ticker, exchange)
            historical = df.tail(periods)
            debug_info["step"] = "prophet_predict_minutes"
            prophet_df = prophet_predict(df, periods, freq)
            debug_info["step"] = "lightgbm_predict_minutes"
            lgbm_df = lightgbm_predict(df, periods, freq)
        else:
            return JSONResponse(status_code=400, content={"error": "invalid_time_range", "details": debug_info})
        # Save CSV in new format
        save_prediction_csv_v2(ticker, exchange, historical, prophet_df, lgbm_df, periods, time_range)
        return {
            "historical": df_to_list_sorted(historical),
            "prophet": df_to_list_sorted(prophet_df.head(periods)),
            "lgbm": df_to_list_sorted(lgbm_df.head(periods)),
            "debug": debug_info
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={
            "error": str(e),
            "trace": traceback.format_exc(),
            "details": {
                "ticker": locals().get("ticker", ""),
                "exchange": locals().get("exchange", ""),
                "time_range": locals().get("time_range", ""),
                "step": locals().get("debug_info", {}).get("step", ""),
            }
        })
