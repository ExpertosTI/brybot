"""Real-world Market Sentiment, Volatility Index (VIX/VXN), and Intermarket Health Engine for Renace Trading Lab."""
from __future__ import annotations

import logging
import time
from typing import Any, Dict, Optional
import requests

from app.real_market_data import fetch_real_quote

logger = logging.getLogger(__name__)

_SENTIMENT_CACHE: Optional[Dict[str, Any]] = None
_SENTIMENT_CACHE_TIME: float = 0
SENTIMENT_CACHE_TTL = 300  # 5 minutes


def fetch_crypto_fear_and_greed() -> Dict[str, Any]:
    """Fetches real-time Fear and Greed Index from Alternative.me."""
    try:
        url = "https://api.alternative.me/fng/?limit=1"
        res = requests.get(url, timeout=4)
        if res.status_code == 200:
            data = res.json()
            item = data.get("data", [{}])[0]
            val = int(item.get("value", 50))
            classification = item.get("value_classification", "Neutral")
            return {
                "value": val,
                "classification": classification,
                "source": "Alternative.me Live API",
            }
    except Exception as e:
        logger.warning(f"Could not fetch crypto fear & greed: {e}")

    return {
        "value": 54,
        "classification": "Neutral a Avaricia Moderada",
        "source": "Baseline Model",
    }


def fetch_intermarket_metrics() -> Dict[str, Any]:
    """Fetches real-world values for VIX, DXY, and 10Y Yield."""
    global _SENTIMENT_CACHE, _SENTIMENT_CACHE_TIME
    now = time.time()

    if _SENTIMENT_CACHE and (now - _SENTIMENT_CACHE_TIME) < SENTIMENT_CACHE_TTL:
        return _SENTIMENT_CACHE

    # 1. Fetch DXY
    dxy_quote = fetch_real_quote("DXY")
    dxy_price = dxy_quote.get("price", 101.4)
    dxy_change = dxy_quote.get("change", 0.0)

    # 2. Fetch VIX via Yahoo query2
    vix_price = 15.2
    vix_change = -0.5
    try:
        r = requests.get("https://query2.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d", timeout=4)
        if r.status_code == 200:
            res_json = r.json()
            meta = res_json.get("chart", {}).get("result", [{}])[0].get("meta", {})
            vix_price = float(meta.get("regularMarketPrice") or 15.2)
            prev = float(meta.get("chartPreviousClose") or vix_price)
            vix_change = round(((vix_price - prev) / prev) * 100, 2) if prev > 0 else 0.0
    except Exception as e:
        logger.warning(f"Could not fetch VIX: {e}")

    # 3. Crypto Fear and Greed
    fng = fetch_crypto_fear_and_greed()

    # 4. Wall Street Sentiment Score (0 to 100)
    # Higher when VIX is low and equity market is trending up
    if vix_price < 15:
        wall_st_sentiment = 78
        wall_st_state = "Avaricia / Confianza Institucional Alta"
        vix_status = "Baja Volatilidad (Favorable para Compras/Longs)"
    elif vix_price <= 20:
        wall_st_sentiment = 62
        wall_st_state = "Neutral a Favorable"
        vix_status = "Volatilidad Normal de Mercado"
    elif vix_price <= 28:
        wall_st_sentiment = 40
        wall_st_state = "Miedo Moderado / Alerta de Turbulencia"
        vix_status = "Alta Volatilidad (Reducir Lotes y Ajustar SL)"
    else:
        wall_st_sentiment = 22
        wall_st_state = "Pánico / Extrema Volatilidad"
        vix_status = "Volatilidad Extrema (Precaución Máxima)"

    # Intermarket Health Rating
    is_risk_on = dxy_change <= 0.2 and vix_price < 22
    intermarket_regime = "RISK-ON (Favorable a Índices y Acciones)" if is_risk_on else "RISK-OFF (Flujo hacia Refugios y Dólar)"

    result = {
        "vix": {
            "price": round(vix_price, 2),
            "change": vix_change,
            "status": vix_status,
            "interpretation": "Mide el costo del seguro y la volatilidad esperada en opciones del S&P 500 a 30 días.",
        },
        "dxy": {
            "price": round(dxy_price, 2),
            "change": dxy_change,
            "bias": "ALCISTA (Presión en Índices)" if dxy_change > 0.15 else "BAJISTA / NEUTRAL (Impulso a Índices)",
        },
        "fear_and_greed": fng,
        "wall_street_sentiment": {
            "score": wall_st_sentiment,
            "state": wall_st_state,
        },
        "intermarket_regime": intermarket_regime,
        "timestamp": int(now),
    }

    _SENTIMENT_CACHE = result
    _SENTIMENT_CACHE_TIME = now
    return result
