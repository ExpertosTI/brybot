# app/trading_routes.py
from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
import os, csv
from .projectx import execute_trade
from .scheduler import run_bot
from .auth import get_session_token

router = APIRouter()

LOG_PATH = os.path.join("logs", "trades.csv")
os.makedirs("logs", exist_ok=True)

class TradingSignal(BaseModel):
    symbol: str
    side: str  # "BUY" | "SELL"
    quantity: int

@router.get("/test-trade")
def test_trade():
    token = get_session_token()
    if not token:
        return {"error": "Authentication failed"}
    return execute_trade(symbol="NQU5", side="buy", quantity=1, token=token)

@router.post("/webhook")
async def receive_signal(signal: TradingSignal):
    with open(LOG_PATH, "a", newline="") as f:
        csv.writer(f).writerow([datetime.now(), signal.symbol, signal.side, signal.quantity])

    token = get_session_token()
    if not token:
        return {"status": "error", "message": "Authentication failed"}

    result = execute_trade(signal.symbol, signal.side, signal.quantity, token)
    return {"status": "received", "result": result}
