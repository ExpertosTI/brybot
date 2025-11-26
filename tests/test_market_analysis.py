import os
import sys
import pandas as pd

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.market_analysis import (  # noqa: E402
    detect_fair_value_gaps,
    detect_liquidity_sweeps,
    identify_supply_demand_zones,
    ohlc_to_dataframe,
)


def test_ohlc_to_dataframe_parses_payload():
    payload = {
        "t": [1, 2],
        "o": [10, 11],
        "h": [12, 13],
        "l": [9, 10],
        "c": [11, 12],
        "v": [100, 110],
    }
    df = ohlc_to_dataframe(payload)
    assert list(df.columns) == ["open", "high", "low", "close", "volume"]
    assert len(df) == 2


def test_detect_liquidity_sweep_flags_buy_side():
    index = pd.date_range("2024-01-01", periods=6, freq="1min")
    df = pd.DataFrame(
        {
            "open": [10, 10.5, 10.7, 10.9, 11.5, 10.6],
            "high": [10.6, 10.8, 11.0, 11.2, 12.5, 10.9],
            "low": [9.9, 10.2, 10.5, 10.7, 11.0, 10.5],
            "close": [10.4, 10.6, 10.8, 10.9, 10.7, 10.7],
            "volume": [100] * 6,
        },
        index=index,
    )
    sweeps = detect_liquidity_sweeps(df, lookback=3)
    assert any(s.side == "buy_side" for s in sweeps)


def test_detect_fair_value_gap_bullish():
    index = pd.date_range("2024-01-01", periods=5, freq="1min")
    df = pd.DataFrame(
        {
            "open": [10, 10.2, 10.8, 11.0, 11.2],
            "high": [10.3, 10.4, 11.5, 11.2, 11.3],
            "low": [9.8, 10.0, 10.7, 10.9, 11.0],
            "close": [10.2, 10.3, 11.2, 11.1, 11.25],
        },
        index=index,
    )
    gaps = detect_fair_value_gaps(df)
    assert any(g.direction == "bullish" for g in gaps)


def test_supply_and_demand_zone_detection():
    index = pd.date_range("2024-01-01", periods=10, freq="1min")
    df = pd.DataFrame(
        {
            "open": [10, 10.2, 10.3, 10.6, 10.8, 10.5, 10.4, 10.3, 10.2, 10.1],
            "high": [10.2, 10.4, 10.6, 10.9, 11.0, 10.7, 10.6, 10.5, 10.3, 10.2],
            "low": [9.9, 10.0, 10.1, 10.4, 10.6, 10.2, 10.1, 10.0, 9.9, 9.8],
            "close": [10.1, 10.3, 10.5, 10.8, 10.9, 10.4, 10.3, 10.2, 10.0, 9.9],
        },
        index=index,
    )
    zones = identify_supply_demand_zones(df, window=2)
    assert any(z.type == "supply" for z in zones)
    assert any(z.type == "demand" for z in zones)
