from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import time
import requests
import os
from config import BASE_URL
from app.auth import get_session_token
import pandas as pd
from datetime import datetime, timedelta
from app.indicators import compute_indicators
from app.strategy import check_trade_signal
from app.projectx import execute_trade, get_contract_id
from logger import log_trade

DEBUG = os.getenv("DEBUG", "0") == "1"

# Global bot state shared across requests
BOT_STATE = {
    "buy_threshold": 30,
    "sell_threshold": 70,
    "auto_trade": True,
    "quantity": 1,
    "interval_seconds": 60,
    "stop": False,
}


class BotConfig(BaseModel):
    """Partial update model for bot configuration."""

    buy_threshold: int | None = None
    sell_threshold: int | None = None
    auto_trade: bool | None = None
    quantity: int | None = None
    interval_seconds: int | None = None

router = APIRouter()


class TradeRequest(BaseModel):
    symbol: str
    side: str  # "BUY" or "SELL"
    quantity: int


@router.post("/update-config")
def update_config(config: BotConfig):
    """Update bot configuration while it is running."""
    if config.buy_threshold is not None:
        BOT_STATE["buy_threshold"] = config.buy_threshold
    if config.sell_threshold is not None:
        BOT_STATE["sell_threshold"] = config.sell_threshold
    if config.auto_trade is not None:
        BOT_STATE["auto_trade"] = config.auto_trade
    if config.quantity is not None:
        BOT_STATE["quantity"] = config.quantity
    if config.interval_seconds is not None:
        BOT_STATE["interval_seconds"] = config.interval_seconds
    return {"status": "updated", **BOT_STATE}


@router.post("/stop-bot")
def stop_bot():
    """Signal the running bot loop to stop."""
    BOT_STATE["stop"] = True
    return {"status": "stopping"}


@router.post("/execute-trade")
def execute_trade_endpoint(order: TradeRequest, token: str | None = None):
    """Endpoint to manually execute a trade."""
    token = token or get_session_token()
    response = execute_trade(
        symbol=order.symbol, side=order.side, quantity=order.quantity, token=token
    )
    log_trade(
        order.symbol,
        order.side,
        order.quantity,
        0,
        "SUCCESS" if response.get("success") else "FAIL",
        str(response),
    )
    return response

def fetch_price_data(token, contract_id, interval_minutes=1, lookback_minutes=100):
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=30)

    url = f"{BASE_URL}/api/History/retrieveBars"
    payload = {
        "contractId": contract_id,
        "live": False,
        "startTime": start_time.isoformat() + "Z",
        "endTime": end_time.isoformat() + "Z",
        "unit": 2,  # 2 = Minute
        "unitNumber": interval_minutes,
        "limit": lookback_minutes,
        "includePartialBar": False
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "accept": "application/json"
    }

    print("📡 Requesting bars from:", url)
    print("📨 Payload:", payload)

    response = requests.post(url, json=payload, headers=headers)

    print("📥 Status Code:", response.status_code)
    print("📥 Response Text:", response.text)

    if response.status_code != 200:
        raise Exception(f"Error fetching price data: {response.text}")

    data = response.json()
    if not data.get("success") or "bars" not in data:
        raise Exception(f"Invalid response: {data}")

    bars = data["bars"]
    if not bars:
        print("❌  No bars returned -- skipping this interval.")
        return
    df = pd.DataFrame(bars)
    df.rename(columns={
        't': 'timestamp',
        'o': 'open',
        'h': 'high',
        'l': 'low',
        'c': 'close',
        'v': 'volume'
    }, inplace=True)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df.set_index('timestamp', inplace=True)
    return df

@router.get("/run-bot")
def run_bot(
    symbol: str = "RTYZ4",
    quantity: int = 1,
    interval_seconds: int = 60,
    buy_threshold: int = 30,
    sell_threshold: int = 70,
    auto_trade: bool = True,
):
    """Stream bot output to the client in real time using Server-Sent Events."""

    def log(message: str):
        """Format a log line for SSE and print it to the console."""
        print(message)
        return f"data: {message}\n\n"

    def wait_interval():
        nonlocal interval_seconds
        for remaining in range(interval_seconds, 0, -1):
            if DEBUG:
                yield log(f"⏳ Next fetch in {remaining} seconds")
            time.sleep(1)
            interval_seconds = BOT_STATE.get("interval_seconds", interval_seconds)
            if BOT_STATE.get("stop"):
                yield log("🛑 Bot stop requested. Exiting loop.")
                raise StopIteration

    def event_stream():
        nonlocal buy_threshold, sell_threshold, auto_trade, quantity, interval_seconds
        # store initial config in global state
        BOT_STATE.update(
            {
                "buy_threshold": buy_threshold,
                "sell_threshold": sell_threshold,
                "auto_trade": auto_trade,
                "quantity": quantity,
                "interval_seconds": interval_seconds,
                "stop": False,
            }
        )

        yield log(f"📈 Starting bot loop at {datetime.now()}")

        token = get_session_token()
        contract_id = get_contract_id(symbol, token)
        if not contract_id:
            yield log("❌ Could not get contract ID.")
            return

        yield log(
            f"Rules: BUY below {BOT_STATE['buy_threshold']} | SELL above {BOT_STATE['sell_threshold']}"
        )

        while True:
            # Check for stop signal
            if BOT_STATE.get("stop"):
                yield log("🛑 Bot stop requested. Exiting loop.")
                break

            # Pull latest config each iteration
            buy_threshold = BOT_STATE.get("buy_threshold", buy_threshold)
            sell_threshold = BOT_STATE.get("sell_threshold", sell_threshold)
            auto_trade = BOT_STATE.get("auto_trade", auto_trade)
            quantity = BOT_STATE.get("quantity", quantity)
            interval_seconds = BOT_STATE.get("interval_seconds", interval_seconds)
            try:
                yield log(f"\n⏰ Fetching data at {datetime.now()}")
                df = fetch_price_data(token=token, contract_id=contract_id)

                if df is None or df.empty:
                    yield log("⚠️ No data returned.")
                    try:
                        for msg in wait_interval():
                            yield msg
                    except StopIteration:
                        break
                    continue

                indicators = compute_indicators(df)
                required_cols = ['rsi', 'ma_fast', 'ma_slow']
                if not all(col in indicators.columns for col in required_cols):
                    raise Exception(f"Missing indicator columns in DataFrame: {set(required_cols) - set(indicators.columns)}")
                yield log(f"🧪 Indicator columns: {list(indicators.columns)}")
                yield log(f"📊 Indicators computed: {indicators.tail()}")
                yield log(f"📉 RSI: {indicators['rsi'].iloc[-1]}")
                yield log(f"📈 MA Fast: {indicators['ma_fast'].iloc[-1]}")
                yield log(f"📉 MA Slow: {indicators['ma_slow'].iloc[-1]}")

                signal = check_trade_signal(
                    indicators, buy_threshold=buy_threshold, sell_threshold=sell_threshold
                )

                yield log(f"📊 Latest Close: {df['close'].iloc[-1]:.2f} | Signal: {signal}")

                if signal == "BUY":
                    yield log("🟢 BUY signal detected!")
                    if auto_trade:
                        response = execute_trade(symbol=symbol, side="BUY", quantity=quantity, token=token)
                        yield log(f"✅ Trade response: {response}")
                        log_trade(symbol, "BUY", quantity, df['close'].iloc[-1], "SUCCESS" if response.get("success") else "FAIL", str(response))
                    else:
                        prompt = {
                            "type": "prompt",
                            "side": "BUY",
                            "price": df['close'].iloc[-1],
                            "symbol": symbol,
                            "quantity": quantity,
                        }
                        yield log(json.dumps(prompt))
                elif signal == "SELL":
                    yield log("🔴 SELL signal detected!")
                    if auto_trade:
                        response = execute_trade(symbol=symbol, side="SELL", quantity=quantity, token=token)
                        yield log(f"✅ Trade response: {response}")
                        log_trade(symbol, "SELL", quantity, df['close'].iloc[-1], "SUCCESS" if response.get("success") else "FAIL", str(response))
                    else:
                        prompt = {
                            "type": "prompt",
                            "side": "SELL",
                            "price": df['close'].iloc[-1],
                            "symbol": symbol,
                            "quantity": quantity,
                        }
                        yield log(json.dumps(prompt))
                else:
                    yield log("⏳ No trade signal at this time.")

            except Exception as e:
                yield log(f"❌ Error during bot loop: {str(e)}")

            try:
                for msg in wait_interval():
                    yield msg
            except StopIteration:
                break

    return StreamingResponse(event_stream(), media_type="text/event-stream")
