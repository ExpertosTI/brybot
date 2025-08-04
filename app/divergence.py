from dataclasses import dataclass
from typing import List
import pandas as pd


@dataclass
class DivergenceSignal:
    """Structure representing a divergence signal."""
    divergence_type: str
    index1: int
    index2: int
    price1: float
    price2: float
    indicator1: float
    indicator2: float


def _find_pivots(series: pd.Series):
    """Return indices of local highs and lows in a series."""
    highs = []
    lows = []
    values = series.values
    for i in range(1, len(values) - 1):
        if values[i] > values[i - 1] and values[i] > values[i + 1]:
            highs.append(i)
        if values[i] < values[i - 1] and values[i] < values[i + 1]:
            lows.append(i)
    return highs, lows


def detect_divergence(
    df: pd.DataFrame,
    price_col: str = "close",
    indicator_col: str = "rsi",
) -> List[DivergenceSignal]:
    """Detect regular and hidden divergences between price and an indicator."""
    signals: List[DivergenceSignal] = []
    price_series = df[price_col]
    indicator_series = df[indicator_col]

    highs, lows = _find_pivots(price_series)

    # Bullish divergences (use lows)
    if len(lows) >= 2:
        idx1, idx2 = lows[-2], lows[-1]
        p1, p2 = price_series.iloc[idx1], price_series.iloc[idx2]
        ind1, ind2 = indicator_series.iloc[idx1], indicator_series.iloc[idx2]
        if p2 < p1 and ind2 > ind1:
            signals.append(
                DivergenceSignal("bullish_regular", idx1, idx2, p1, p2, ind1, ind2)
            )
            print(
                f"Regular bullish divergence detected: price {p1}->{p2}, indicator {ind1}->{ind2}"
            )
        elif p2 > p1 and ind2 < ind1:
            signals.append(
                DivergenceSignal("bullish_hidden", idx1, idx2, p1, p2, ind1, ind2)
            )
            print(
                f"Hidden bullish divergence detected: price {p1}->{p2}, indicator {ind1}->{ind2}"
            )

    # Bearish divergences (use highs)
    if len(highs) >= 2:
        idx1, idx2 = highs[-2], highs[-1]
        p1, p2 = price_series.iloc[idx1], price_series.iloc[idx2]
        ind1, ind2 = indicator_series.iloc[idx1], indicator_series.iloc[idx2]
        if p2 > p1 and ind2 < ind1:
            signals.append(
                DivergenceSignal("bearish_regular", idx1, idx2, p1, p2, ind1, ind2)
            )
            print(
                f"Regular bearish divergence detected: price {p1}->{p2}, indicator {ind1}->{ind2}"
            )
        elif p2 < p1 and ind2 > ind1:
            signals.append(
                DivergenceSignal("bearish_hidden", idx1, idx2, p1, p2, ind1, ind2)
            )
            print(
                f"Hidden bearish divergence detected: price {p1}->{p2}, indicator {ind1}->{ind2}"
            )

    return signals
