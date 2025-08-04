import os
import time
from typing import Any, Dict, Optional

import requests
from dotenv import load_dotenv


class TradingViewAPIError(Exception):
    """Base exception for TradingView API errors."""


class TradingViewRateLimitError(TradingViewAPIError):
    """Raised when the API rate limit is exceeded after retries."""


class TradingViewClient:
    """Simple wrapper around the TradingView REST API.

    Parameters
    ----------
    api_key: Optional[str]
        TradingView API key. Falls back to the ``TRADINGVIEW_API_KEY``
        environment variable if not provided.
    base_url: Optional[str]
        Base URL for the API. Defaults to ``TRADINGVIEW_BASE_URL`` env or
        ``https://api.tradingview.com``.
    max_retries: int
        Number of times to retry a request when a rate limit response (HTTP
        429) is encountered.
    backoff_factor: float
        Sleep time factor between retries. Actual sleep time is
        ``backoff_factor * (2 ** attempt)``.
    session: Optional[requests.Session]
        Custom session instance, primarily for testing.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        max_retries: int = 3,
        backoff_factor: float = 0.5,
        session: Optional[requests.Session] = None,
    ) -> None:
        load_dotenv()
        self.api_key = api_key or os.getenv("TRADINGVIEW_API_KEY")
        self.base_url = base_url or os.getenv("TRADINGVIEW_BASE_URL", "https://api.tradingview.com")
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self.session = session or requests.Session()

        if not self.api_key:
            raise ValueError("TradingView API key is required")

    # ------------------------------------------------------------------
    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
        }

    # ------------------------------------------------------------------
    def _request(self, method: str, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        for attempt in range(self.max_retries):
            response = self.session.request(method, url, headers=self._headers(), params=params)
            # Handle rate limiting
            if response.status_code == 429:
                sleep_time = self.backoff_factor * (2 ** attempt)
                time.sleep(sleep_time)
                continue
            try:
                response.raise_for_status()
            except requests.HTTPError as exc:
                raise TradingViewAPIError(f"HTTP error: {exc}") from exc
            try:
                return response.json()
            except ValueError as exc:  # pragma: no cover - defensive
                raise TradingViewAPIError("Invalid JSON response") from exc
        raise TradingViewRateLimitError("Max retries exceeded due to rate limits")

    # ------------------------------------------------------------------
    def get_ohlc(self, symbol: str, resolution: str, start: int, end: int) -> Dict[str, Any]:
        """Fetch OHLC data for a symbol.

        Parameters
        ----------
        symbol: str
            Instrument symbol, e.g. ``"AAPL"``.
        resolution: str
            Bar resolution (e.g. ``"1"`` for 1 minute, ``"D"`` for daily).
        start: int
            Start timestamp in seconds since the epoch.
        end: int
            End timestamp in seconds since the epoch.
        """
        params = {
            "symbol": symbol,
            "resolution": resolution,
            "from": int(start),
            "to": int(end),
        }
        return self._request("GET", "/history", params=params)

    # ------------------------------------------------------------------
    def get_indicator(self, symbol: str, indicator: str, **params: Any) -> Dict[str, Any]:
        """Fetch indicator data for a symbol.

        Parameters
        ----------
        symbol: str
            Instrument symbol.
        indicator: str
            Indicator name (API specific).
        params: Any
            Additional query parameters accepted by the endpoint.
        """
        params = {"symbol": symbol, **params}
        return self._request("GET", f"/indicators/{indicator}", params=params)
