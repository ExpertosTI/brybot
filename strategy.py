def check_trade_signal(df):
    rsi = df['rsi'].iloc[-1]
    ma_fast = df['ma_fast'].iloc[-1]
    ma_slow = df['ma_slow'].iloc[-1]

    print(f"🧪 Debug: RSI={rsi:.2f}, MA Fast={ma_fast:.2f}, MA Slow={ma_slow:.2f}")

    if rsi < 50:
        return "BUY"
    elif rsi > 50:
        return "SELL"
    return "HOLD"
