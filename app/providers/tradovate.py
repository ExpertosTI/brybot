from __future__ import annotations

from .base import ProviderAdapter
from .types import IntegrationCapability, IntegrationProvider


class TradovateAdapter(ProviderAdapter):
    provider = IntegrationProvider.TRADOVATE
    capabilities = {
        IntegrationCapability.BROKER_TRADING,
        IntegrationCapability.MARKET_DATA,
        IntegrationCapability.ACCOUNT_INFO,
    }

    def validate_credentials(self) -> None:
        if not self.credentials:
            raise ValueError("Tradovate credentials are not configured.")

    async def healthcheck(self) -> dict:
        if not self.credentials:
            return {"status": "not_configured", "message": "Tradovate credentials missing."}
        return {"status": "ok"}

    async def place_order(self, order: dict) -> dict:
        raise NotImplementedError("Tradovate trading adapter is not implemented yet.")
