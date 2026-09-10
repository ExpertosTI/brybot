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
CREDENTIALS_ENCRYPTION_KEY=your-32-byte-base64-fernet-key
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ACCOUNT_ID=your-topstep-account-id
TOPSTEP_ACCOUNT_ID=your-topstep-account-id
TRADINGVIEW_API_KEY=your-tradingview-api-key
TRADINGVIEW_BASE_URL=https://api.tradingview.com  # optional
```

> `CREDENTIALS_ENCRYPTION_KEY` is optional. If omitted, the backend derives an encryption key
> from `SECRET_KEY`. Use an explicit Fernet key for production.

## 🧭 New user onboarding & integrations

1. Start the backend and frontend (see setup above).
2. Visit `/register` to create a new account.
3. Registration automatically provisions an active `Demo Account` with synthetic market data,
  a virtual balance, and paper orders. No live broker is contacted in demo mode.
4. You can use every dashboard workflow in demo mode immediately, or connect platforms like
  TopStepX, Tradovate, NinjaTrader, TradingView, or Interactive Brokers from `/integrations`.
5. Return to `/dashboard` to run the trading bot.

## 🗃️ Running migrations

```bash
alembic upgrade head
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

## 🚢 Despliegue compuesto

El dominio público previsto es `https://trade.adderlymarte.com`. El despliegue incluye
Traefik, HTTPS mediante Let's Encrypt, PostgreSQL, backend FastAPI y frontend React.

### Despliegue único en RENACE Swarm

```bash
cp .env.example .env
# Edita .env y sustituye todos los secretos y credenciales de ejemplo.
chmod +x deploy.sh
./deploy.sh
```

`deploy.sh` es el único archivo operativo. Valida que el nodo esté en Swarm, comprueba la
red externa `RenaceNet`, construye backend y frontend, despliega el stack `brybot`, espera
las réplicas y verifica `https://trade.adderlymarte.com/healthz`. Para actualizar, se vuelve
a ejecutar el mismo archivo:

```bash
./deploy.sh
```

Si el disco raíz supera el 85%, el script elimina contenedores detenidos y todo el cache
reclamable de BuildKit antes de construir. No ejecuta limpiezas de volúmenes, por lo que
los datos persistentes de PostgreSQL no se eliminan automáticamente.

El `docker-compose.yml` reutiliza Traefik existente en `RenaceNet` y el resolver
`letsencryptresolver`; no levanta otro Traefik ni ocupa los puertos 80/443.

Diagnóstico y rollback:

```bash
docker stack services brybot
docker stack ps brybot --no-trunc
docker service logs -f brybot_backend
docker service logs -f brybot_frontend
docker service rollback brybot_backend
docker service rollback brybot_frontend
curl -fsS https://trade.adderlymarte.com/healthz
```

No se deben guardar `.env`, `.env.swarm` ni credenciales en Git. Antes de activar
auto-trading, valida primero en observación o paper trading.
