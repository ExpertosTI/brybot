# TopStep MVP Bot

This repository contains a FastAPI backend with a simple React frontend to interact with TopStepX. The backend exposes authentication routes using JWT and integrates existing TopStep login logic. The frontend allows users to log in and view a minimal dashboard.

## 🚀 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 🔐 Backend Setup

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head  # run from project root to apply migrations
uvicorn app.main:app --reload
```

## 🧪 ENV

Create a `.env` file with the following values:

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/topstepdb
TOPSTEP_USER=your@email.com
TOPSTEP_API_KEY=your-api-key
SECRET_KEY=your-secret
ACCOUNT_ID=your-topstep-account-id
TOPSTEP_ACCOUNT_ID=your-topstep-account-id
TRADINGVIEW_API_KEY=your-tradingview-api-key
TRADINGVIEW_BASE_URL=https://api.tradingview.com  # optional
```

## 📈 TradingView API

A lightweight wrapper for the TradingView API lives in `app/tradingview_api.py`. It provides
helpers for fetching OHLC data and indicators while handling authentication and rate limits.

```python
from app.tradingview_api import TradingViewClient

client = TradingViewClient()
data = client.get_ohlc("AAPL", "1", 1690000000, 1690003600)
print(data)
```

Set `TRADINGVIEW_API_KEY` in your `.env` to authenticate requests. If no TradingView
credentials are available, the analysis and backtest endpoints will fall back to Topstep
history when a valid Topstep session token and contract lookup are available (supports 1m/3m
intervals).

### 🧠 Advanced market structure endpoints

The API now exposes richer TradingView-powered analysis under `/analysis`:

- `POST /analysis/market-analysis` – fetch OHLC data from TradingView and return divergence, liquidity sweep, fair value gap, and supply/demand zone detections.
- `POST /analysis/backtest` – run the RSI-based strategy against historical candles (e.g., 1m or 3m) to see how it would have performed. Returns trade log, PnL, and pattern counts.

Example payload:

```json
{
  "symbol": "ES",
  "resolution": "1",
  "start": 1690000000,
  "end": 1690003600,
  "buy_threshold": 30,
  "sell_threshold": 70
}
```

### ⏱️ Intraday bot intervals

The streaming bot can now fetch either 1-minute or 3-minute bars via the `bar_interval_minutes` parameter on `/scheduler/run-bot`, while still honoring the existing `interval_seconds` poll cadence.
