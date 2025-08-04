import os
import sys

import pandas as pd

# Ensure the app package is importable
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.divergence import detect_divergence


def _has_signal(signals, signal_type):
    return any(s.divergence_type == signal_type for s in signals)


def test_regular_bullish_divergence():
    df = pd.DataFrame(
        {
            "close": [10, 9, 8, 9, 7, 8],
            "rsi": [40, 35, 30, 35, 32, 40],
        }
    )
    signals = detect_divergence(df)
    assert _has_signal(signals, "bullish_regular")


def test_regular_bearish_divergence():
    df = pd.DataFrame(
        {
            "close": [10, 11, 12, 11, 13, 12],
            "rsi": [60, 65, 70, 65, 68, 60],
        }
    )
    signals = detect_divergence(df)
    assert _has_signal(signals, "bearish_regular")


def test_hidden_bullish_divergence():
    df = pd.DataFrame(
        {
            "close": [10, 8, 9, 8.5, 10],
            "rsi": [40, 30, 35, 25, 50],
        }
    )
    signals = detect_divergence(df)
    assert _has_signal(signals, "bullish_hidden")


def test_hidden_bearish_divergence():
    df = pd.DataFrame(
        {
            "close": [10, 13, 12, 12.5, 11],
            "rsi": [60, 70, 65, 72, 50],
        }
    )
    signals = detect_divergence(df)
    assert _has_signal(signals, "bearish_hidden")
