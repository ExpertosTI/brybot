# TradingView API Integration

This document describes how to use the TradingView API wrapper included with the project.

## Configuration

Set the following variables in your `.env` file:

```
TRADINGVIEW_API_KEY=your-tradingview-api-key
TRADINGVIEW_BASE_URL=https://api.tradingview.com  # optional
```

## Usage

```python
from app.tradingview_api import TradingViewClient

client = TradingViewClient()
# Fetch one minute candles for AAPL
bars = client.get_ohlc("AAPL", "1", 1690000000, 1690003600)
```

The client retries requests that return HTTP 429 responses using exponential backoff.
