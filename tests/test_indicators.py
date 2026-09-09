import pandas as pd
import numpy as np
from app.indicators import compute_indicators


def test_compute_indicators_columns():
    prices = [10.0 + i for i in range(30)]
    df = pd.DataFrame({"close": prices})
    result = compute_indicators(df)

    expected_cols = ["close", "rsi", "ma_fast", "ma_slow", "macd", "macd_signal", "macd_hist"]
    for col in expected_cols:
        assert col in result.columns

    # Verify RSI values are within [0, 100]
    assert result["rsi"].min() >= 0
    assert result["rsi"].max() <= 100

    # Fast MA on upward series should be greater than slow MA
    assert result["ma_fast"].iloc[-1] > result["ma_slow"].iloc[-1]


def test_compute_indicators_empty():
    df = pd.DataFrame()
    assert compute_indicators(df).empty


def test_compute_indicators_missing_close():
    df = pd.DataFrame({"open": [1, 2, 3]})
    res = compute_indicators(df)
    assert "rsi" not in res.columns
