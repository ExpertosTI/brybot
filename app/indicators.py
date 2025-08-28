import pandas as pd
import pandas_ta as ta


def compute_indicators(df):
    """Compute common technical indicators used by the trading bot.

    Currently calculates:
    - Relative Strength Index (RSI)
    - Simple moving averages (fast/slow)
    - Moving Average Convergence Divergence (MACD)

    Parameters
    ----------
    df : pandas.DataFrame
        DataFrame expected to contain a ``close`` column.

    Returns
    -------
    pandas.DataFrame
        Original DataFrame with indicator columns appended.
    """

    df["rsi"] = ta.rsi(df["close"], length=14)
    df["ma_fast"] = ta.sma(df["close"], length=9)
    df["ma_slow"] = ta.sma(df["close"], length=21)

    macd = ta.macd(df["close"], fast=12, slow=26, signal=9)
    if macd is not None:
        df["macd"] = macd["MACD_12_26_9"]
        df["macd_signal"] = macd["MACDs_12_26_9"]
        df["macd_hist"] = macd["MACDh_12_26_9"]

    return df
