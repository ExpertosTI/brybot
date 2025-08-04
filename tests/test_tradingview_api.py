import os
import sys
from unittest.mock import Mock

import pytest
import requests

# Ensure the app package is importable
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.tradingview_api import (
    TradingViewClient,
    TradingViewAPIError,
    TradingViewRateLimitError,
)


def make_response(status=200, json_data=None):
    resp = Mock()
    resp.status_code = status
    resp.json = Mock(return_value=json_data or {})
    resp.raise_for_status = Mock()
    return resp


def test_get_ohlc_success():
    session = Mock()
    session.request = Mock(return_value=make_response(json_data={"s": "ok"}))

    client = TradingViewClient(api_key="token", session=session)
    data = client.get_ohlc("AAPL", "1", 0, 1)

    assert data["s"] == "ok"
    session.request.assert_called_once()


def test_get_ohlc_http_error():
    session = Mock()
    resp = make_response(status=500)
    resp.raise_for_status.side_effect = requests.HTTPError("boom")
    session.request = Mock(return_value=resp)

    client = TradingViewClient(api_key="token", session=session)
    with pytest.raises(TradingViewAPIError):
        client.get_ohlc("AAPL", "1", 0, 1)


def test_rate_limit_retry():
    session = Mock()
    responses = [make_response(status=429), make_response(json_data={"s": "ok"})]
    session.request = Mock(side_effect=responses)

    client = TradingViewClient(api_key="token", session=session, backoff_factor=0)
    data = client.get_ohlc("AAPL", "1", 0, 1)

    assert data["s"] == "ok"
    assert session.request.call_count == 2


def test_rate_limit_exceeded():
    session = Mock()
    session.request = Mock(return_value=make_response(status=429))

    client = TradingViewClient(api_key="token", session=session, max_retries=2, backoff_factor=0)
    with pytest.raises(TradingViewRateLimitError):
        client.get_ohlc("AAPL", "1", 0, 1)
