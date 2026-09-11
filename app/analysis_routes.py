from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.backtesting import _fetch_ohlc_with_fallback, fetch_market_analysis, run_backtest

router = APIRouter()


def _sanitize_window(start: int, end: int) -> tuple[int, int]:
    now_ts = int(datetime.utcnow().timestamp())
    if end <= start or start <= 0 or end > now_ts + 86400:
        end = now_ts
        start = end - (3600 * 24 * 7)  # default 7 days
    return start, end


class MarketRequest(BaseModel):
    symbol: str = Field(..., description="Instrument symbol, e.g. ES")
    resolution: str = Field("1", description="TradingView resolution (1,3,D,etc)")
    start: int = Field(..., description="Unix timestamp (seconds) for start of window")
    end: int = Field(..., description="Unix timestamp (seconds) for end of window")


class BacktestRequest(MarketRequest):
    buy_threshold: int = Field(30, ge=0, le=100)
    sell_threshold: int = Field(70, ge=0, le=100)


@router.get("/candles")
def get_candles(
    symbol: str = Query("ES"),
    resolution: str = Query("1"),
    count: int = Query(200, ge=20, le=1000),
) -> Dict[str, Any]:
    """Retrieve formatted candlestick data for Lightweight Charts."""
    now_ts = int(datetime.utcnow().timestamp())
    minutes = 1
    if resolution.isdigit():
        minutes = max(1, int(resolution))
    elif resolution.upper() == "D":
        minutes = 1440

    step = minutes * 60
    start = now_ts - (count * step)
    end = now_ts

    try:
        raw = _fetch_ohlc_with_fallback(symbol=symbol, resolution=resolution, start=start, end=end, client=None)
        candles = []
        for i in range(len(raw.get("t", []))):
            candles.append({
                "time": raw["t"][i],
                "open": raw["o"][i],
                "high": raw["h"][i],
                "low": raw["l"][i],
                "close": raw["c"][i],
                "volume": raw["v"][i] if i < len(raw.get("v", [])) else 0,
            })
        return {
            "symbol": symbol.upper(),
            "resolution": resolution,
            "candles": candles,
            "last_price": candles[-1]["close"] if candles else 5500.0,
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/market-analysis")
def market_analysis(request: MarketRequest) -> Dict[str, Any]:
    try:
        s, e = _sanitize_window(request.start, request.end)
        return fetch_market_analysis(
            symbol=request.symbol,
            resolution=request.resolution,
            start=s,
            end=e,
        )
    except Exception as exc:  # noqa: BLE001 - surfaced as API error
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/backtest")
def backtest(request: BacktestRequest) -> Dict[str, Any]:
    try:
        s, e = _sanitize_window(request.start, request.end)
        summary = run_backtest(
            symbol=request.symbol,
            resolution=request.resolution,
            start=s,
            end=e,
            buy_threshold=request.buy_threshold,
            sell_threshold=request.sell_threshold,
        )
        return {
            "trades": [trade.__dict__ for trade in summary.trades],
            "total_pnl": summary.total_pnl,
            "wins": summary.wins,
            "losses": summary.losses,
            "signals": summary.signals,
            "patterns": summary.patterns,
        }
    except Exception as exc:  # noqa: BLE001 - surfaced as API error
        raise HTTPException(status_code=400, detail=str(exc)) from exc


class GeminiAdvisorRequest(BaseModel):
    symbol: str = "NQ"
    current_price: float = 19750.0
    rsi: float = 48.5
    ma_fast: float = 19745.0
    ma_slow: float = 19730.0
    structure: Optional[Dict[str, Any]] = None


@router.post("/gemini-advisor")
def gemini_advisor_endpoint(request: GeminiAdvisorRequest) -> Dict[str, Any]:
    """Provides real-time cognitive trading advice powered by Google Gemini AI."""
    from app.gemini_advisor import generate_gemini_trade_advice

    try:
        return generate_gemini_trade_advice(
            symbol=request.symbol,
            current_price=request.current_price,
            rsi=request.rsi,
            ma_fast=request.ma_fast,
            ma_slow=request.ma_slow,
            structure=request.structure,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


class WhatsAppNotifyRequest(BaseModel):
    type: str = "signal"  # "signal" | "risk_limit" | "test"
    symbol: str = "NQ"
    side: str = "BUY"
    entry: float = 19750.0
    stop_loss: float = 19730.0
    take_profit: float = 19790.0
    reason: str = "Mitigación de FVG + Divergencia de RSI"
    current_loss: float = 0.0
    max_loss: float = 2000.0
    recipient: Optional[str] = None


@router.post("/whatsapp-notify")
def whatsapp_notify_endpoint(request: WhatsAppNotifyRequest) -> Dict[str, Any]:
    """Dispatches trade signals or risk alerts to WhatsApp via Evolution API."""
    from app.evolution_notifier import notify_risk_limit_hit, notify_trade_signal, send_whatsapp_message

    if request.type == "risk_limit":
        return notify_risk_limit_hit(
            current_loss=request.current_loss,
            max_loss=request.max_loss,
            recipient=request.recipient,
        )
    elif request.type == "test":
        msg = (
            "🚀 *RENACE TRADING LAB | CONEXIÓN EVOLUTION API EXITOSA*\n\n"
            "✅ Notificaciones activas para señales cuantitativas de Google Gemini y alertas de riesgo TopStep.\n"
            "📱 Tu canal directo con el mercado financiero en tiempo real."
        )
        return send_whatsapp_message(msg, recipient=request.recipient)
    else:
        return notify_trade_signal(
            symbol=request.symbol,
            side=request.side,
            entry=request.entry,
            stop_loss=request.stop_loss,
            take_profit=request.take_profit,
            reason=request.reason,
            recipient=request.recipient,
        )


