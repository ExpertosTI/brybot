from __future__ import annotations

from datetime import datetime, timedelta, timezone

from .base import ProviderAdapter
from .types import IntegrationCapability, IntegrationProvider


class DemoAdapter(ProviderAdapter):
    """Deterministic local market and paper-trading adapter."""

    provider = IntegrationProvider.DEMO
    capabilities = {
        IntegrationCapability.BROKER_TRADING,
        IntegrationCapability.MARKET_DATA,
        IntegrationCapability.ACCOUNT_INFO,
        IntegrationCapability.PAPER_TRADING,
    }

    def validate_credentials(self) -> None:
        return None

    async def get_contracts(self) -> list[dict]:
        return [{"name": symbol, "description": f"Demo {symbol}"} for symbol in ("ES", "NQ", "YM", "CL", "GC")]

    async def get_account(self) -> dict:
        balance = float(self.metadata.get("startingBalance", 100000))
        return {
            "account_id": self.metadata.get("accountId", "DEMO-ACCOUNT"),
            "balance": balance,
            "equity": balance,
            "currency": "USD",
            "mode": "demo",
        }

    async def place_order(self, order: dict) -> dict:
        symbol = order.get("symbol")
        side = str(order.get("side", "")).upper()
        quantity = order.get("quantity")
        if not symbol or side not in {"BUY", "SELL"} or not quantity or quantity < 1:
            raise ValueError("Order requires symbol, side, and positive quantity.")
        return {
            "success": True,
            "mode": "demo",
            "paper": True,
            "order_id": f"DEMO-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}",
            "symbol": symbol,
            "side": side,
            "quantity": quantity,
            "message": "Paper order accepted. No live broker was contacted.",
        }

    def _get_session_token(self) -> str:
        return "demo-session"

    def get_contract_id(self, symbol: str) -> str:
        return f"DEMO-{symbol.upper()}"

    def get_bars(self, token: str, contract_id: str, interval_minutes: int, start_time: str, end_time: str, limit: int) -> list[dict]:
        end = datetime.now(timezone.utc)
        base = 5000 + (sum(ord(char) for char in contract_id) % 500)
        bars = []
        for index in range(limit):
            timestamp = end - timedelta(minutes=(limit - index) * interval_minutes)
            close = base + ((index % 20) - 10) * 2 + (index % 7)
            bars.append({"t": timestamp.isoformat(), "o": close - 1, "h": close + 3, "l": close - 3, "c": close, "v": 100 + index})
        return bars