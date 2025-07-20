# main.py
from fastapi import FastAPI, Request
from pydantic import BaseModel
from projectx import execute_trade
import csv
from datetime import datetime
import os
from app.scheduler import run_bot
from app.auth import get_session_token

app = FastAPI()

LOG_PATH = os.path.join("logs", "trades.csv")
os.makedirs("logs", exist_ok=True)

class TradingSignal(BaseModel):
    symbol: str
    side: str  # "BUY" or "SELL"
    quantity: int

@app.get("/test-trade")
def test_trade():
    token = get_session_token()
    if not token:
        return {"error": "Authentication failed"}
    return execute_trade(symbol="NQU5", side="buy", quantity=1, token=token)

@app.post("/webhook")
async def receive_signal(signal: TradingSignal):
    print(f"Received signal: {signal}")

    # Log to CSV
    with open(LOG_PATH, "a", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([datetime.now(), signal.symbol, signal.side, signal.quantity])

    token = get_session_token()
    if not token:
        return {"status": "error", "message": "Authentication failed"}

    # Send to ProjectX (this will be implemented next)
    result = execute_trade(signal.symbol, signal.side, signal.quantity, token)
    return {"status": "received", "result": result}

if __name__ == "__main__":
    # You can change symbol or quantity here
    run_bot(symbol="NQU5", quantity=1, interval_seconds=60)
