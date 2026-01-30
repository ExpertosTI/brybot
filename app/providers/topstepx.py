from __future__ import annotations

import logging
import os
from typing import Any

import requests

from .base import ProviderAdapter, ProviderCapabilityError
from .types import IntegrationCapability, IntegrationProvider


logger = logging.getLogger(__name__)


class TopStepXAdapter(ProviderAdapter):
    provider = IntegrationProvider.TOPSTEPX
    capabilities = {
        IntegrationCapability.BROKER_TRADING,
        IntegrationCapability.MARKET_DATA,
        IntegrationCapability.ACCOUNT_INFO,
    }

    def __init__(self, credentials: dict, metadata: dict | None = None) -> None:
        super().__init__(credentials, metadata)
        self.base_url = (
            credentials.get("baseUrl")
            or (metadata or {}).get("baseUrl")
            or os.getenv("TOPSTEP_BASE_URL", "https://api.topstepx.com")
        )

    def validate_credentials(self) -> None:
        if not self.credentials.get("userName") or not self.credentials.get("apiKey"):
            raise ValueError("TopStepX credentials require userName and apiKey.")

    def _get_session_token(self) -> str:
        self.validate_credentials()
        url = f"{self.base_url}/api/Auth/loginKey"
        payload = {"userName": self.credentials["userName"], "apiKey": self.credentials["apiKey"]}
        headers = {"accept": "text/plain", "Content-Type": "application/json"}
        response = requests.post(url, headers=headers, json=payload, timeout=20)
        response.raise_for_status()
        data = response.json()
        if data.get("success") and data.get("token"):
            return data["token"]
        raise ValueError(data.get("errorMessage") or "TopStepX authentication failed.")

    async def healthcheck(self) -> dict:
        try:
            self._get_session_token()
        except Exception as exc:
            return {"status": "error", "message": str(exc)}
        return {"status": "ok"}

    async def get_contracts(self) -> list[dict]:
        token = self._get_session_token()
        url = f"{self.base_url}/api/Contract/search"
        payload = {"searchText": "", "live": False}
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        response = requests.post(url, headers=headers, json=payload, timeout=20)
        response.raise_for_status()
        data = response.json()
        return data.get("contracts", [])

    def get_contract_id(self, symbol: str) -> int | None:
        token = self._get_session_token()
        url = f"{self.base_url}/api/Contract/search"
        payload = {"searchText": symbol.upper(), "live": False}
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        response = requests.post(url, headers=headers, json=payload, timeout=20)
        if not response.ok:
            return None
        data = response.json()
        for contract in data.get("contracts", []):
            if symbol.upper() in (contract.get("name"), contract.get("description")):
                return contract.get("id")
        return None

    def _get_active_account_id(self, token: str) -> int | None:
        url = f"{self.base_url}/api/Account/search"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        payload = {"onlyActiveAccounts": True}
        response = requests.post(url, headers=headers, json=payload, timeout=20)
        if not response.ok:
            logger.warning("TopStepX account search failed with status %s", response.status_code)
            return None
        data = response.json()
        accounts = data.get("accounts") or []
        if not accounts:
            return None
        return accounts[0].get("id")

    async def get_account(self) -> dict:
        token = self._get_session_token()
        account_id = self._get_active_account_id(token)
        if not account_id:
            raise ProviderCapabilityError("No active account available for TopStepX.")
        return {"account_id": account_id}

    async def place_order(self, order: dict) -> dict:
        token = self._get_session_token()
        symbol = order.get("symbol")
        side = order.get("side")
        quantity = order.get("quantity")
        if not symbol or not side or not quantity:
            raise ValueError("Order requires symbol, side, and quantity.")

        account_id = self._get_active_account_id(token)
        if not account_id:
            return {"success": False, "errorMessage": "No active account available to place trade."}

        contract_id = self.get_contract_id(symbol)
        if not contract_id:
            return {"success": False, "errorMessage": f"Could not find contract for symbol: {symbol}"}

        url = f"{self.base_url}/api/Order/place"
        payload = {
            "accountId": account_id,
            "contractId": contract_id,
            "type": 2,
            "side": 0 if str(side).upper() == "BUY" else 1,
            "size": quantity,
            "timeInForce": "GTC",
        }
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        response = requests.post(url, headers=headers, json=payload, timeout=20)
        if not response.ok:
            try:
                payload = response.json()
            except ValueError:
                payload = {"errorMessage": response.text}
            return {
                "success": False,
                "status": response.status_code,
                "errorMessage": payload.get("errorMessage") or payload,
            }
        return response.json()

    def get_bars(
        self,
        token: str,
        contract_id: int,
        interval_minutes: int,
        start_time: str,
        end_time: str,
        limit: int,
    ) -> list[dict]:
        url = f"{self.base_url}/api/History/retrieveBars"
        payload = {
            "contractId": contract_id,
            "live": False,
            "startTime": start_time,
            "endTime": end_time,
            "unit": 2,
            "unitNumber": interval_minutes,
            "limit": limit,
            "includePartialBar": False,
        }
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        response = requests.post(url, json=payload, headers=headers, timeout=20)
        response.raise_for_status()
        data = response.json()
        if not data.get("success") or "bars" not in data:
            raise ValueError("Invalid response from TopStepX bars API.")
        return data["bars"]
