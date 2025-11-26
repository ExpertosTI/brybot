"""Backtesting helpers powered by TradingView OHLC data."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd

from app.indicators import compute_indicators
from app.strategy import check_trade_signal
from app.tradingview_api import TradingViewClient
from app.market_analysis import (
    detect_fair_value_gaps,
    detect_liquidity_sweeps,
    identify_supply_demand_zones,
    ohlc_to_dataframe,
    summarize_market_structure,
)
from app.divergence import detect_divergence


@dataclass
class Trade:
    side: str
    entry_time: datetime
    exit_time: datetime
    entry_price: float
    exit_price: float
    pnl: float


@dataclass
class BacktestSummary:
    trades: List[Trade]
    total_pnl: float
    wins: int
    losses: int
    signals: Dict[str, int]
    patterns: Dict[str, Any]


class BacktestError(Exception):
    """Raised when a backtest cannot be completed."""


def _generate_signals(df: pd.DataFrame, buy_threshold: int, sell_threshold: int) -> List[str]:
    signals: List[str] = []
    for i in range(len(df)):
        window = df.iloc[: i + 1]
        if window[["rsi", "ma_fast", "ma_slow"]].isnull().any().any():
            signals.append("HOLD")
            continue
        signals.append(check_trade_signal(window, buy_threshold, sell_threshold))
    return signals


def run_backtest(
    symbol: str,
    resolution: str,
    start: int,
    end: int,
    buy_threshold: int = 30,
    sell_threshold: int = 70,
    client: Optional[TradingViewClient] = None,
) -> BacktestSummary:
    """Backtest the RSI strategy against TradingView history."""
    client = client or TradingViewClient()
    raw = client.get_ohlc(symbol, resolution, start, end)
    df = ohlc_to_dataframe(raw)

    df = compute_indicators(df)
    df["signal"] = _generate_signals(df, buy_threshold, sell_threshold)

    trades: List[Trade] = []
    position: Optional[str] = None
    entry_price = 0.0
    entry_time: Optional[pd.Timestamp] = None

    for timestamp, row in df.iterrows():
        signal = row["signal"]
        price = float(row["close"])

        if signal == "BUY":
            if position == "SHORT":
                pnl = entry_price - price
                trades.append(
                    Trade("SHORT", entry_time.to_pydatetime(), timestamp.to_pydatetime(), entry_price, price, pnl)
                )
                position = None
            if position is None:
                position = "LONG"
                entry_price = price
                entry_time = timestamp

        if signal == "SELL":
            if position == "LONG":
                pnl = price - entry_price
                trades.append(
                    Trade("LONG", entry_time.to_pydatetime(), timestamp.to_pydatetime(), entry_price, price, pnl)
                )
                position = None
            if position is None:
                position = "SHORT"
                entry_price = price
                entry_time = timestamp

    wins = sum(1 for t in trades if t.pnl > 0)
    losses = sum(1 for t in trades if t.pnl <= 0)
    total_pnl = sum(t.pnl for t in trades)

    pattern_summary = {
        "divergences": len(detect_divergence(df.dropna(subset=["close", "rsi"], how="any"))),
        "liquidity_sweeps": len(detect_liquidity_sweeps(df)),
        "fair_value_gaps": len(detect_fair_value_gaps(df)),
        "supply_demand_zones": len(identify_supply_demand_zones(df)),
    }

    signals_summary = {
        "buy": sum(1 for s in df["signal"] if s == "BUY"),
        "sell": sum(1 for s in df["signal"] if s == "SELL"),
        "hold": sum(1 for s in df["signal"] if s == "HOLD"),
    }

    return BacktestSummary(
        trades=trades,
        total_pnl=total_pnl,
        wins=wins,
        losses=losses,
        signals=signals_summary,
        patterns=pattern_summary,
    )


def fetch_market_analysis(
    symbol: str,
    resolution: str,
    start: int,
    end: int,
    client: Optional[TradingViewClient] = None,
) -> Dict[str, Any]:
    """Pull TradingView data and return market-structure insights."""
    client = client or TradingViewClient()
    payload = client.get_ohlc(symbol, resolution, start, end)
    df = compute_indicators(ohlc_to_dataframe(payload))
    return summarize_market_structure(df)
