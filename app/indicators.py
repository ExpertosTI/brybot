import numpy as np
import pandas as pd


def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Compute common technical indicators used by the trading bot.

    Calculates:
    - Relative Strength Index (RSI 14) via Wilder's Smoothing
    - Simple moving averages: Fast (SMA 9) & Slow (SMA 21)
    - Moving Average Convergence Divergence (MACD 12, 26, 9)

    Parameters
    ----------
    df : pandas.DataFrame
        DataFrame expected to contain a 'close' column.

    Returns
    -------
    pandas.DataFrame
        Original DataFrame with indicator columns appended:
        'rsi', 'ma_fast', 'ma_slow', 'macd', 'macd_signal', 'macd_hist'.
    """
    if df is None or len(df) == 0:
        return df

    if "close" not in df.columns:
        return df

    close = df["close"].astype(float)

    # Simple Moving Averages
    df["ma_fast"] = close.rolling(window=9, min_periods=1).mean()
    df["ma_slow"] = close.rolling(window=21, min_periods=1).mean()

    # Relative Strength Index (RSI 14) using Wilder's smoothing
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)

    avg_gain = gain.ewm(alpha=1.0 / 14, min_periods=14, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0 / 14, min_periods=14, adjust=False).mean()

    rs = avg_gain / avg_loss.replace(0.0, np.nan)
    rsi = 100.0 - (100.0 / (1.0 + rs))
    df["rsi"] = rsi.fillna(50.0)

    # Moving Average Convergence Divergence (MACD 12, 26, 9)
    ema_fast = close.ewm(span=12, adjust=False).mean()
    ema_slow = close.ewm(span=26, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    hist = macd_line - signal_line

    df["macd"] = macd_line
    df["macd_signal"] = signal_line
    df["macd_hist"] = hist

    return df

