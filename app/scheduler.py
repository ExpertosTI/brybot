from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import asyncio
import os
import pandas as pd
from datetime import datetime, timedelta
from app.indicators import compute_indicators
from app.strategy import check_trade_signal
from logger import log_trade
from sqlalchemy.orm import Session

from app import database, models
from app.auth_routes import decode_jwt_token, get_current_user_model, get_user_by_username
from app.integrations_service import env_fallback_enabled, env_topstepx_credentials, resolve_integration
from app.providers.factory import get_adapter
from app.providers.topstepx import TopStepXAdapter
from app.providers.types import IntegrationCapability

DEBUG = os.getenv("DEBUG", "0") == "1"

# Global bot state shared across requests
BOT_STATE = {
    "buy_threshold": 30,
    "sell_threshold": 70,
    "auto_trade": True,
    "quantity": 1,
    "interval_seconds": 60,
    "bar_interval_minutes": 1,
    "stop": False,
}


class BotConfig(BaseModel):
    """Partial update model for bot configuration."""

    buy_threshold: int | None = None
    sell_threshold: int | None = None
    auto_trade: bool | None = None
    quantity: int | None = None
    interval_seconds: int | None = None
    bar_interval_minutes: int | None = None

router = APIRouter()


class TradeRequest(BaseModel):
    symbol: str
    side: str  # "BUY" or "SELL"
    quantity: int
    integration_id: int | None = None


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
    if config.bar_interval_minutes is not None:
        BOT_STATE["bar_interval_minutes"] = config.bar_interval_minutes
    return {"status": "updated", **BOT_STATE}


@router.post("/stop-bot")
def stop_bot():
    """Signal the running bot loop to stop."""
    BOT_STATE["stop"] = True
    return {"status": "stopping"}


@router.post("/execute-trade")
async def execute_trade_endpoint(
    order: TradeRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_model),
):
    """Endpoint to manually execute a trade."""
    integration = resolve_integration(
        db,
        current_user.id,
        integration_id=order.integration_id,
        required_capabilities={IntegrationCapability.BROKER_TRADING},
    )

    adapter = None
    source = None
    if integration:
        adapter = get_adapter(integration)
        source = integration.provider.lower()
    elif env_fallback_enabled():
        env_credentials = env_topstepx_credentials()
        if env_credentials:
            adapter = TopStepXAdapter(env_credentials, {})
            source = "env"

    if not adapter:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active broker integration configured. Activate a broker integration to trade.",
        )

    response = await adapter.place_order(
        {"symbol": order.symbol, "side": order.side, "quantity": order.quantity}
    )
    log_trade(
        order.symbol,
        order.side,
        order.quantity,
        0,
        "SUCCESS" if response.get("success") else "FAIL",
        str(response),
    )
    response["source"] = source
    return response

def fetch_price_data(adapter: TopStepXAdapter, symbol: str, interval_minutes=1, lookback_minutes=100):
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=30)

    token = adapter._get_session_token()
    contract_id = adapter.get_contract_id(symbol)
    if not contract_id:
        raise Exception("Could not get contract ID.")

    bars = adapter.get_bars(
        token=token,
        contract_id=contract_id,
        interval_minutes=interval_minutes,
        start_time=start_time.isoformat() + "Z",
        end_time=end_time.isoformat() + "Z",
        limit=lookback_minutes,
    )
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
    bar_interval_minutes: int = 1,
    access_token: str | None = None,
    integration_id: int | None = None,
):
    """Stream bot output to the client in real time using Server-Sent Events."""

    def log(message: str):
        """Format a log line for SSE and print it to the console."""
        print(message)
        return f"data: {message}\n\n"

    async def wait_interval():
        nonlocal interval_seconds
        for remaining in range(interval_seconds, 0, -1):
            if DEBUG:
                yield log(f"⏳ Next fetch in {remaining} seconds")
            await asyncio.sleep(1)
            interval_seconds = BOT_STATE.get("interval_seconds", interval_seconds)
            if BOT_STATE.get("stop"):
                yield log("🛑 Bot stop requested. Exiting loop.")
                return

    async def event_stream():
        nonlocal buy_threshold, sell_threshold, auto_trade, quantity, interval_seconds, bar_interval_minutes
        # store initial config in global state
        BOT_STATE.update(
            {
                "buy_threshold": buy_threshold,
                "sell_threshold": sell_threshold,
                "auto_trade": auto_trade,
                "quantity": quantity,
                "interval_seconds": interval_seconds,
                "bar_interval_minutes": bar_interval_minutes,
                "stop": False,
            }
        )

        yield log(f"📈 Starting bot loop at {datetime.now()}")

        if not access_token:
            yield log("❌ Missing access token for bot session.")
            return

        db = database.SessionLocal()
        try:
            try:
                username = decode_jwt_token(access_token)
            except Exception:
                yield log("❌ Invalid or expired access token.")
                return

            user = get_user_by_username(db, username)
            if not user:
                yield log("❌ User not found for access token.")
                return

            integration = resolve_integration(
                db,
                user.id,
                integration_id=integration_id,
                required_capabilities={
                    IntegrationCapability.BROKER_TRADING,
                    IntegrationCapability.MARKET_DATA,
                },
            )

            adapter = None
            if integration:
                adapter = get_adapter(integration)
            elif env_fallback_enabled():
                env_credentials = env_topstepx_credentials()
                if env_credentials:
                    adapter = TopStepXAdapter(env_credentials, {})

            if not adapter:
                yield log("❌ No active broker integration configured.")
                return

            if not isinstance(adapter, TopStepXAdapter):
                yield log("❌ Market data is not implemented for the selected provider.")
                return
        finally:
            db.close()

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
            bar_interval_minutes = BOT_STATE.get("bar_interval_minutes", bar_interval_minutes)
            try:
                yield log(f"\n⏰ Fetching data at {datetime.now()}")
                if bar_interval_minutes not in (1, 3):
                    yield log("⚠️ Interval must be 1 or 3 minutes; defaulting to 1.")
                    bar_interval = 1
                else:
                    bar_interval = bar_interval_minutes

                df = fetch_price_data(
                    adapter=adapter, symbol=symbol, interval_minutes=bar_interval
                )

                if df is None or df.empty:
                    yield log("⚠️ No data returned.")
                    try:
                        async for msg in wait_interval():
                            yield msg
                    except StopAsyncIteration:
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
                        response = await adapter.place_order(
                            {"symbol": symbol, "side": "BUY", "quantity": quantity}
                        )
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
                        response = await adapter.place_order(
                            {"symbol": symbol, "side": "SELL", "quantity": quantity}
                        )
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
                async for msg in wait_interval():
                    yield msg
            except StopAsyncIteration:
                break

    return StreamingResponse(event_stream(), media_type="text/event-stream")
