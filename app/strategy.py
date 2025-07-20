def check_trade_signal(df, buy_threshold: int = 30, sell_threshold: int = 70):
    """Return BUY/SELL/HOLD based on RSI thresholds."""
    rsi = df['rsi'].iloc[-1]
    ma_fast = df['ma_fast'].iloc[-1]
    ma_slow = df['ma_slow'].iloc[-1]

    print(
        f"🧪 Debug: RSI={rsi:.2f}, MA Fast={ma_fast:.2f}, MA Slow={ma_slow:.2f}"
    )

    if rsi < buy_threshold:
        return "BUY"
    elif rsi > sell_threshold:
        return "SELL"
    return "HOLD"
