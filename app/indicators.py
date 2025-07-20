import pandas as pd
import pandas_ta as ta
from ta.momentum import RSIIndicator
from ta.trend import EMAIndicator, SMAIndicator


def compute_indicators(df):
    df["rsi"] = ta.rsi(df["close"], length=14)
    df["ma_fast"] = ta.sma(df["close"], length=9)
    df["ma_slow"] = ta.sma(df["close"], length=21)
    return df
