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

