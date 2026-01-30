from __future__ import annotations

from abc import ABC, abstractmethod

from .types import IntegrationCapability, IntegrationProvider


class ProviderCapabilityError(RuntimeError):
    pass


class ProviderAdapter(ABC):
    provider: IntegrationProvider
    capabilities: set[IntegrationCapability]

    def __init__(self, credentials: dict, metadata: dict | None = None) -> None:
        self.credentials = credentials
        self.metadata = metadata or {}

    async def healthcheck(self) -> dict:
        return {"status": "ok"}

    async def get_contracts(self) -> list[dict]:
        raise ProviderCapabilityError("Provider does not support market data.")

    async def get_account(self) -> dict:
        raise ProviderCapabilityError("Provider does not support account info.")

    async def place_order(self, order: dict) -> dict:
        raise ProviderCapabilityError("Provider does not support trading.")

    @abstractmethod
    def validate_credentials(self) -> None:
        raise NotImplementedError
