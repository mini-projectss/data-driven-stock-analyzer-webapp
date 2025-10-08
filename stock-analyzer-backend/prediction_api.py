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

    # Prepare dataframe for Prophet
    df_prop = df[['Close']].reset_index().rename(columns={'date':'ds', 'Close':'y'}) if 'date' in df.reset_index().columns else df[['Close']].reset_index().rename(columns={'index':'ds','Close':'y'})
    if 'ds' not in df_prop.columns:
        df_prop = df_prop.reset_index().rename(columns={'index':'ds'})
    df_prop['ds'] = pd.to_datetime(df_prop['ds'])
    df_prop = df_prop.dropna(subset=['y']).copy()
    if df_prop.empty:
        return pd.DataFrame(columns=['Open','High','Low','Close'])

    # Apply log1p transform only for daily data
    if freq == 'D':
        df_prop['y'] = np.log1p(df_prop['y'].astype(float))
        log_transform = True
    else:
        df_prop['y'] = df_prop['y'].astype(float)
        log_transform = False

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

    # Invert log-transform if applied
    if log_transform:
        for col in ['yhat', 'yhat_lower', 'yhat_upper']:
            if col in forecast.columns:
                forecast[col] = np.expm1(forecast[col])

    # Clamp Prophet predictions around last close (±20%)
    last_close = df['Close'].iloc[-1]
    if 'yhat' in forecast.columns:
        forecast['yhat'] = forecast['yhat'].clip(
            lower=last_close * 0.8,
            upper=last_close * 1.2
        )

    preds = forecast[['ds','yhat']].set_index('ds')
    pred_close = preds['yhat'].values

    # Synthetic OHLC around close
    volatility = 0.02
    rng = np.random.default_rng(seed=42)
    pred_high = pred_close * (1 + rng.uniform(volatility/2, volatility, len(pred_close)))
    pred_low = pred_close * (1 - rng.uniform(volatility/2, volatility, len(pred_close)))
    pred_open = pred_close * (1 + rng.uniform(-volatility/2, volatility/2, len(pred_close)))

    out = pd.DataFrame({
        'Open': pred_open,
        'High': pred_high,
        'Low': pred_low,
        'Close': pred_close
    }, index=preds.index)
    out.index.name = 'date'
    return out


    # Fit model
    model.fit(df_prop)

    # Build future frame -- include_history=False as original
    future = model.make_future_dataframe(periods=periods, freq=freq, include_history=False)
    forecast = model.predict(future)

    # Invert transformation: expm1 for yhat and intervals
    for col in ['yhat', 'yhat_lower', 'yhat_upper']:
        if col in forecast.columns:
            forecast[col] = np.expm1(forecast[col])

    # Ensure non-negative predictions (clip small positive)
    for col in ['yhat', 'yhat_lower', 'yhat_upper']:
        if col in forecast.columns:
            forecast[col] = forecast[col].clip(lower=0.01)

    preds = forecast[['ds','yhat']].set_index('ds')
    pred_close = preds['yhat'].values

    # Create synthetic OHLC around predicted close to mimic original behavior
    volatility = 0.02
    rng = np.random.default_rng(seed=42)  # deterministic randomness
    pred_high = pred_close * (1 + rng.uniform(volatility/2, volatility, len(pred_close)))
    pred_low = pred_close * (1 - rng.uniform(volatility/2, volatility, len(pred_close)))
    pred_open = pred_close * (1 + rng.uniform(-volatility/2, volatility/2, len(pred_close)))

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
    """Always fetch from yfinance for hours/minutes. Robustly handle MultiIndex columns,
    numeric conversion, timezone-naive indices, and common yfinance shapes."""
    if yf is None:
        raise RuntimeError("yfinance not available")

    yf_ticker = normalize_ticker_for_yf(ticker, exchange)
    print(f"[prediction_api] Fetching yfinance data: ticker={ticker}, exchange={exchange}, yf_ticker={yf_ticker}, period={period}, interval={interval}")

    df = yf.download(yf_ticker, period=period, interval=interval, progress=False, auto_adjust=True)
    print(f"[prediction_api] yfinance returned shape: {df.shape} columns: {list(df.columns)}")

    if df.empty:
        raise ValueError(f"No data for {yf_ticker}")

    # If yfinance returned a MultiIndex (e.g. ('Close','ABB.NS')), try to select columns for our ticker
    if isinstance(df.columns, pd.MultiIndex):
        # Try to keep only columns that belong to requested ticker symbol
        wanted_cols = []
        # Normalize comparison
        yf_ticker_up = yf_ticker.upper()
        for col in df.columns:
            # col may be a tuple like ('Close', 'ABB.NS') or ('Close', '') depending on yfinance
            try:
                first, second = col[0], col[1]
            except Exception:
                first = col[0] if isinstance(col, tuple) else col
                second = ''
            # match if second level matches yf_ticker or endswith ticker (handles minor differences)
            if isinstance(second, str) and second.upper() in (yf_ticker_up, yf_ticker_up.replace('.NS','').replace('.BO','')):
                wanted_cols.append(col)
            elif first in ['Open', 'High', 'Low', 'Close']:
                # keep any standard OHLC first-level columns as fallback
                wanted_cols.append(col)
        if not wanted_cols:
            # fallback: pick any columns with first level Open/High/Low/Close
            wanted_cols = [col for col in df.columns if (isinstance(col, tuple) and col[0] in ['Open','High','Low','Close'])]
        if not wanted_cols:
            raise ValueError(f"Could not find OHLC columns for {yf_ticker} in MultiIndex data: {df.columns}")

        df = df[wanted_cols]

        # flatten columns to single-level names (Open, High, Low, Close)
        new_cols = []
        for col in df.columns:
            if isinstance(col, tuple):
                new_cols.append(col[0])
            else:
                new_cols.append(col)
        df.columns = new_cols

    # At this point columns should be single-level; ensure OHLC columns exist (create if missing)
    for col in ['Open', 'High', 'Low', 'Close']:
        if col not in df.columns:
            df[col] = np.nan

    # Convert columns to numeric safely (sometimes yfinance returns object dtype)
    for col in ['Open', 'High', 'Low', 'Close']:
        # If column contains DataFrame-like objects, try to extract first column
        if isinstance(df[col], pd.DataFrame):
            df[col] = df[col].iloc[:, 0]
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Drop rows that don't have at least 'Close' (but prefer rows with full OHLC when available)
    # If you require strict OHLC for downstream models, change subset to ['Open','High','Low','Close']
    if 'Close' in df.columns:
        df = df.dropna(subset=['Close'])
    else:
        df = df.dropna(how='all')

    if df.empty:
        raise ValueError(f"No valid OHLC data after cleaning for {yf_ticker}")

    # Remove timezone info from index to avoid tz-aware vs tz-naive mismatches
    try:
        if getattr(df.index, 'tz', None) is not None:
            df.index = df.index.tz_localize(None)
    except Exception:
        # If tz_localize fails (already naive), ignore
        pass

    # Ensure we return only the standard OHLC columns (and drop rows with NaNs across all OHLC)
    df = df[['Open', 'High', 'Low', 'Close']]
    # If every column has NaNs on some rows it's fine, but drop rows that are entirely NaN
    df = df.dropna(how='all', subset=['Open', 'High', 'Low', 'Close'])

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


def postprocess_prediction_df(pred_df: pd.DataFrame, historical_df: pd.DataFrame,
                              max_pct: float = 0.20, abs_limit: float = 50.0,
                              min_frac: float = 0.01, smooth_window: int = 3,
                              volatility_for_ohlc: float = 0.02,
                              rng_seed: int = 42) -> pd.DataFrame:
    """
    - pred_df: DataFrame with columns ['Open','High','Low','Close'] and datetime index
    - historical_df: historical DataFrame (must contain 'Close' and a last index)
    - max_pct: allowed change fraction relative to last_close (e.g. 0.20 = ±20%)
    - abs_limit: absolute rupee limit for +/- relative bounds (applied as additional constraint)
    - min_frac: minimum fraction of last_close allowed (prevents zero)
    - smooth_window: rolling window to smooth predicted Close (set 1 to skip smoothing)
    - volatility_for_ohlc: used to recreate OHLC around final Close deterministically
    - Returns clipped & smoothed DataFrame with same index and columns
    """
    if pred_df is None or pred_df.empty:
        return pred_df

    last_close = float(historical_df['Close'].iloc[-1])

    # compute bounds (±20% but max ±50 Rs)
    min_allowed = max(0.01, last_close * min_frac)

    lower_by_pct = last_close * (1 - max_pct)
    upper_by_pct = last_close * (1 + max_pct)
    lower_by_abs = last_close - abs_limit
    upper_by_abs = last_close + abs_limit

    # Final bounds = max(lower) and min(upper)
    lower_bound = max(min_allowed, lower_by_pct, lower_by_abs)
    upper_bound = min(upper_by_pct, upper_by_abs)

    if upper_bound <= lower_bound:
        upper_bound = lower_bound + max(0.01, last_close * 0.01)

    df = pred_df.copy()
    if 'Close' not in df.columns:
        raise ValueError("pred_df must contain 'Close' column")

    df['Close'] = df['Close'].clip(lower=lower_bound, upper=upper_bound)

    if smooth_window and smooth_window > 1:
        df['Close'] = df['Close'].rolling(window=min(smooth_window, len(df)), min_periods=1).mean()
    df['Close'] = df['Close'].clip(lower=lower_bound, upper=upper_bound)
    df['Close'] = df['Close'].clip(lower=min_allowed)

    rng = np.random.default_rng(seed=rng_seed)
    n = len(df)
    high_offsets = rng.uniform(volatility_for_ohlc/2, volatility_for_ohlc, n)
    low_offsets = rng.uniform(volatility_for_ohlc/2, volatility_for_ohlc, n)
    open_offsets = rng.uniform(-volatility_for_ohlc/2, volatility_for_ohlc/2, n)

    df['High'] = (df['Close'] * (1 + high_offsets)).clip(upper=upper_bound)
    df['Low']  = (df['Close'] * (1 - low_offsets)).clip(lower=lower_bound)
    prev_close = np.concatenate(([last_close], df['Close'].values[:-1]))
    df['Open'] = (prev_close * (1 + open_offsets)).clip(lower=lower_bound, upper=upper_bound)

    df['High'] = df[['High','Open','Close']].max(axis=1)
    df['Low']  = df[['Low','Open','Close']].min(axis=1)

    df[['Open','High','Low','Close']] = df[['Open','High','Low','Close']].clip(lower=min_allowed, upper=upper_bound)

    return df



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
                    # postprocess LGBM
                    try:
                        lgbm_df = postprocess_prediction_df(lgbm_df, df,
                                                           max_pct=0.35,
                                                           abs_limit=100.0,
                                                           min_frac=0.01,
                                                           smooth_window=1)
                    except Exception:
                        # if postprocess fails, keep raw
                        pass
                if prophet_df is None:
                    debug_info["step"] = "prophet_predict_days"
                    prophet_df = prophet_predict(df, periods, freq)
                    # postprocess Prophet
                    try:
                        prophet_df = postprocess_prediction_df(prophet_df, df,
                                                              max_pct=0.35,
                                                              abs_limit=100.0,
                                                              min_frac=0.01,
                                                              smooth_window=3)
                    except Exception:
                        # if postprocess fails, keep raw
                        pass
                historical = df.tail(periods)
            else:
                debug_info["step"] = "preprocessed_days"
                # postprocess preprocessed data to ensure bounds/smoothing
                try:
                    prophet_df = postprocess_prediction_df(prophet_df, lgbm_df,
                                                          max_pct=0.35,
                                                          abs_limit=100.0,
                                                          min_frac=0.01,
                                                          smooth_window=3)
                except Exception:
                    pass
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
            # postprocess prophet
            try:
                prophet_df = postprocess_prediction_df(prophet_df, df,
                                                      max_pct=0.10,
                                                      abs_limit=20.0,
                                                      min_frac=0.5,
                                                      smooth_window=3)
            except Exception:
                pass

            debug_info["step"] = "lightgbm_predict_hours"
            lgbm_df = lightgbm_predict(df, periods, freq)
            # postprocess lgbm
            try:
                lgbm_df = postprocess_prediction_df(lgbm_df, df,
                                                    max_pct=0.35,
                                                    abs_limit=50.0,
                                                    min_frac=0.01,
                                                    smooth_window=1)
            except Exception:
                pass
        elif time_range == "minutes":
            periods, freq, period, interval = 60, 'min', "1d", "1m"
            debug_info.update({"period": period, "interval": interval})
            debug_info["step"] = "fetch_yfinance_minutes"
            df = load_historical_data_yf(ticker, exchange, period, interval)
            debug_info["yf_ticker"] = normalize_ticker_for_yf(ticker, exchange)
            historical = df.tail(periods)
            debug_info["step"] = "prophet_predict_minutes"
            prophet_df = prophet_predict(df, periods, freq)
            # postprocess prophet
            try:
                prophet_df = postprocess_prediction_df(prophet_df, df,
                                                      max_pct=0.10,
                                                      abs_limit=20.0,
                                                      min_frac=0.5,
                                                      smooth_window=3)
            except Exception:
                pass

            debug_info["step"] = "lightgbm_predict_minutes"
            lgbm_df = lightgbm_predict(df, periods, freq)
            # postprocess lgbm
            try:
                lgbm_df = postprocess_prediction_df(lgbm_df, df,
                                                    max_pct=0.35,
                                                    abs_limit=50.0,
                                                    min_frac=0.01,
                                                    smooth_window=1)
            except Exception:
                pass
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
