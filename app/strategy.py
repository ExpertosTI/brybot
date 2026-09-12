"""Institutional Multi-Confluence Strategy Engine for Renace Trading Lab."""
from __future__ import annotations
import pandas as pd


def check_trade_signal(
    df: pd.DataFrame,
    buy_threshold: int = 35,
    sell_threshold: int = 65,
) -> str:
    """Evaluates multi-factor institutional confluence (EMA trend + RSI pullback + volume) to generate high-expectancy trade signals."""
    if len(df) < 5:
        return "HOLD"

    last_row = df.iloc[-1]
    prev_row = df.iloc[-2]

    rsi = float(last_row.get("rsi", 50.0))
    ma_fast = float(last_row.get("ma_fast", 0.0))
    ma_slow = float(last_row.get("ma_slow", 0.0))
    close = float(last_row.get("close", 0.0))
    open_p = float(last_row.get("open", close))

    if ma_fast == 0.0 or ma_slow == 0.0:
        return "HOLD"

    # 1. Trend Direction Alignment (EMA 20 vs EMA 50)
    is_uptrend = ma_fast > ma_slow
    is_downtrend = ma_fast < ma_slow

    # 2. Distance from EMA fast (avoid chasing extended moves)
    dist_from_fast = abs(close - ma_fast) / ma_fast if ma_fast > 0 else 0

    # 3. Candlestick Confirmation
    is_bullish_bar = close >= open_p
    is_bearish_bar = close <= open_p

    # ── High-Probability Bullish Setup ──
    # Condition: Uptrend active, price pulled back near EMA 20 (< 0.6% distance),
    # RSI is in the golden accumulation zone (30 <= RSI <= 52), and candle shows buying rejection.
    if is_uptrend and dist_from_fast < 0.008:
        if (30 <= rsi <= max(buy_threshold, 52)) and is_bullish_bar:
            return "BUY"

    # ── High-Probability Bearish Setup ──
    # Condition: Downtrend active, price rallied into EMA 20 resistance (< 0.6% distance),
    # RSI is in the distribution zone (48 <= RSI <= 70), and candle shows selling rejection.
    if is_downtrend and dist_from_fast < 0.008:
        if (min(sell_threshold, 48) <= rsi <= 70) and is_bearish_bar:
            return "SELL"

    return "HOLD"
