"""Market microstructure utilities for advanced signal detection."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List

import pandas as pd

from app.divergence import DivergenceSignal, detect_divergence


@dataclass
class LiquiditySweep:
    side: str
    timestamp: pd.Timestamp
    reference_level: float
    sweep_price: float
    close_price: float


@dataclass
class FairValueGap:
    direction: str
    start: float
    end: float
    timestamp: pd.Timestamp


@dataclass
class Zone:
    type: str
    upper: float
    lower: float
    timestamp: pd.Timestamp


def ohlc_to_dataframe(payload: Dict[str, Any]) -> pd.DataFrame:
    """Convert TradingView history response into a normalized DataFrame."""
    required_keys = {"t", "o", "h", "l", "c"}
    if not payload or not required_keys.issubset(payload.keys()):
        raise ValueError("Invalid OHLC payload from TradingView")

    df = pd.DataFrame(
        {
            "timestamp": pd.to_datetime(payload["t"], unit="s"),
            "open": payload["o"],
            "high": payload["h"],
            "low": payload["l"],
            "close": payload["c"],
            "volume": payload.get("v"),
        }
    )
    df.set_index("timestamp", inplace=True)
    return df


def detect_liquidity_sweeps(df: pd.DataFrame, lookback: int = 10) -> List[LiquiditySweep]:
    """Identify buy- or sell-side liquidity sweeps from OHLC data."""
    sweeps: List[LiquiditySweep] = []
    rolling_high = df["high"].rolling(window=lookback, min_periods=lookback).max().shift(1)
    rolling_low = df["low"].rolling(window=lookback, min_periods=lookback).min().shift(1)

    for idx in df.index:
        prior_high = rolling_high.loc[idx]
        prior_low = rolling_low.loc[idx]
        row = df.loc[idx]

        if pd.notna(prior_high) and row["high"] > prior_high and row["close"] < prior_high:
            sweeps.append(
                LiquiditySweep(
                    side="buy_side",
                    timestamp=idx,
                    reference_level=float(prior_high),
                    sweep_price=float(row["high"]),
                    close_price=float(row["close"]),
                )
            )

        if pd.notna(prior_low) and row["low"] < prior_low and row["close"] > prior_low:
            sweeps.append(
                LiquiditySweep(
                    side="sell_side",
                    timestamp=idx,
                    reference_level=float(prior_low),
                    sweep_price=float(row["low"]),
                    close_price=float(row["close"]),
                )
            )

    return sweeps


def detect_fair_value_gaps(df: pd.DataFrame) -> List[FairValueGap]:
    """Detect basic 3-candle fair value gap formations."""
    gaps: List[FairValueGap] = []
    for i in range(2, len(df)):
        c0, c1, c2 = df.iloc[i - 2], df.iloc[i - 1], df.iloc[i]
        timestamp = df.index[i]

        # Bullish FVG: sharp move up leaving a gap between c0.high and c1.low
        if c1.low > c0.high and c2.low > c0.high:
            gaps.append(
                FairValueGap(
                    direction="bullish",
                    start=float(c0.high),
                    end=float(c1.low),
                    timestamp=timestamp,
                )
            )

        # Bearish FVG: sharp move down leaving a gap between c1.high and c0.low
        if c1.high < c0.low and c2.high < c0.low:
            gaps.append(
                FairValueGap(
                    direction="bearish",
                    start=float(c1.high),
                    end=float(c0.low),
                    timestamp=timestamp,
                )
            )
    return gaps


def identify_supply_demand_zones(df: pd.DataFrame, window: int = 5) -> List[Zone]:
    """Mark swing highs/lows as crude supply and demand zones."""
    zones: List[Zone] = []
    for i in range(len(df)):
        idx = df.index[i]
        row = df.iloc[i]
        start = max(0, i - window)
        end = min(len(df), i + window + 1)
        local_window = df.iloc[start:end]
        if row["high"] >= local_window["high"].max():
            zones.append(
                Zone(
                    type="supply",
                    upper=float(row["high"]),
                    lower=float(row.get("close", row["high"])),
                    timestamp=idx,
                )
            )
        if row["low"] <= local_window["low"].min():
            zones.append(
                Zone(
                    type="demand",
                    upper=float(row.get("close", row["low"])),
                    lower=float(row["low"]),
                    timestamp=idx,
                )
            )
    return zones


def summarize_market_structure(df: pd.DataFrame) -> Dict[str, Any]:
    """Run a suite of higher-level price action checks."""
    divergence_signals: List[DivergenceSignal] = []
    try:
        divergence_signals = detect_divergence(df.dropna(subset=["close", "rsi"], how="any"))
    except Exception:
        divergence_signals = []

    sweeps = detect_liquidity_sweeps(df)
    fvg = detect_fair_value_gaps(df)
    zones = identify_supply_demand_zones(df)

    return {
        "divergences": [vars(sig) for sig in divergence_signals],
        "liquidity_sweeps": [vars(s) for s in sweeps],
        "fair_value_gaps": [vars(g) for g in fvg],
        "supply_demand_zones": [vars(z) for z in zones],
    }
