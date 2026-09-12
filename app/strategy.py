"""Institutional Multi-Confluence Strategy Engine with 3-Hour Trend Alignment and Strict 2-Loss Daily Limit."""
from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd

from app.real_market_data import fetch_real_ohlc

logger = logging.getLogger(__name__)

# ── Daily Loss Circuit Breaker State ──
MAX_DAILY_LOSSES = 2

class DailyLossGuardian:
    """Tracks daily realized trade outcomes to strictly enforce the maximum 2 losses/day limit."""
    def __init__(self):
        self._current_date: str = datetime.utcnow().strftime("%Y-%m-%d")
        self._daily_loss_count: int = 0
        self._daily_win_count: int = 0
        self._lockout_active: bool = False

    def _check_and_reset_day(self):
        today = datetime.utcnow().strftime("%Y-%m-%d")
        if today != self._current_date:
            self._current_date = today
            self._daily_loss_count = 0
            self._daily_win_count = 0
            self._lockout_active = False

    def get_status(self) -> Dict[str, Any]:
        self._check_and_reset_day()
        return {
            "date": self._current_date,
            "daily_loss_count": self._daily_loss_count,
            "daily_win_count": self._daily_win_count,
            "max_allowed_losses": MAX_DAILY_LOSSES,
            "is_locked": self._daily_loss_count >= MAX_DAILY_LOSSES,
            "remaining_allowed_losses": max(0, MAX_DAILY_LOSSES - self._daily_loss_count),
        }

    def record_trade_result(self, is_win: bool, pnl: float = 0.0) -> Dict[str, Any]:
        self._check_and_reset_day()
        if not is_win or pnl < 0:
            self._daily_loss_count += 1
            if self._daily_loss_count >= MAX_DAILY_LOSSES:
                self._lockout_active = True
                logger.warning(
                    f"🛑 DAILY LOSS LIMIT HIT! ({self._daily_loss_count}/{MAX_DAILY_LOSSES}). "
                    f"Trading locked out for the rest of {self._current_date}."
                )
                try:
                    from app.evolution_notifier import notify_daily_loss_limit_reached
                    notify_daily_loss_limit_reached(loss_count=self._daily_loss_count, max_allowed=MAX_DAILY_LOSSES)
                except Exception as e:
                    logger.warning(f"Could not send WhatsApp loss limit alert: {e}")
        else:
            self._daily_win_count += 1

        return self.get_status()

    def is_trading_allowed(self) -> Tuple[bool, str]:
        self._check_and_reset_day()
        if self._daily_loss_count >= MAX_DAILY_LOSSES:
            return False, f"Bloqueo de seguridad: Se alcanzó el límite estricto de {MAX_DAILY_LOSSES} pérdidas diarias ({self._daily_loss_count}/{MAX_DAILY_LOSSES})."
        return True, "Operativa permitida"


daily_risk_guardian = DailyLossGuardian()


# ── 3-Hour Multi-Timeframe Trend Engine ──

def calculate_ema_series(data: List[float], period: int) -> List[float]:
    if not data or len(data) < period:
        return data
    multiplier = 2.0 / (period + 1)
    ema_list = [sum(data[:period]) / period]
    for price in data[period:]:
        ema_list.append((price - ema_list[-1]) * multiplier + ema_list[-1])
    return ema_list


def aggregate_to_3hour_candles(ohlc: Dict[str, Any]) -> Dict[str, List[float]]:
    """Resamples 60m or 30m candles into strict 3-hour (180m / 10800s) bars."""
    t_list = ohlc.get("t", [])
    o_list = ohlc.get("o", [])
    h_list = ohlc.get("h", [])
    l_list = ohlc.get("l", [])
    c_list = ohlc.get("c", [])
    v_list = ohlc.get("v", [])

    if len(t_list) < 3:
        return {"t": t_list, "o": o_list, "h": h_list, "l": l_list, "c": c_list, "v": v_list}

    three_hour_sec = 10800
    aggregated_bars: Dict[int, Dict[str, Any]] = {}

    for i in range(len(t_list)):
        ts = t_list[i]
        bucket = (ts // three_hour_sec) * three_hour_sec
        o, h, l, c = o_list[i], h_list[i], l_list[i], c_list[i]
        v = v_list[i] if i < len(v_list) else 0

        if bucket not in aggregated_bars:
            aggregated_bars[bucket] = {"t": bucket, "o": o, "h": h, "l": l, "c": c, "v": v}
        else:
            bar = aggregated_bars[bucket]
            bar["h"] = max(bar["h"], h)
            bar["l"] = min(bar["l"], l)
            bar["c"] = c
            bar["v"] += v

    sorted_buckets = sorted(aggregated_bars.keys())
    res_t, res_o, res_h, res_l, res_c, res_v = [], [], [], [], [], []
    for b in sorted_buckets:
        bar = aggregated_bars[b]
        res_t.append(bar["t"])
        res_o.append(bar["o"])
        res_h.append(bar["h"])
        res_l.append(bar["l"])
        res_c.append(bar["c"])
        res_v.append(bar["v"])

    return {"t": res_t, "o": res_o, "h": res_h, "l": res_l, "c": res_c, "v": res_v}


def get_3hour_trend(symbol: str) -> Dict[str, Any]:
    """Computes the institutional 3-Hour Trend Direction (EMA 20 vs EMA 50 on 3H timeframe)."""
    sym = symbol.upper().strip()
    # Fetch 60m data (enough to form multiple 3H bars)
    ohlc_60m = fetch_real_ohlc(sym, "60", count=180)
    if not ohlc_60m or len(ohlc_60m.get("c", [])) < 15:
        # Fallback to 30m or 15m
        ohlc_60m = fetch_real_ohlc(sym, "30", count=240) or fetch_real_ohlc(sym, "15", count=300)

    if not ohlc_60m or len(ohlc_60m.get("c", [])) < 10:
        return {
            "symbol": sym,
            "trend": "NEUTRAL",
            "bias": "HOLD",
            "description": "Datos insuficientes para calcular tendencia macro de 3H",
            "ma_fast_3h": 0.0,
            "ma_slow_3h": 0.0,
            "current_price": 0.0,
        }

    bars_3h = aggregate_to_3hour_candles(ohlc_60m)
    closes_3h = bars_3h.get("c", [])
    current_price = closes_3h[-1] if closes_3h else 0.0

    if len(closes_3h) < 5:
        # If not enough aggregated 3h bars, approximate 3h EMA over 60m data (EMA 60 vs EMA 150)
        closes_raw = ohlc_60m.get("c", [])
        current_price = closes_raw[-1]
        ema20_equiv = calculate_ema_series(closes_raw, min(20, len(closes_raw)))[-1]
        ema50_equiv = calculate_ema_series(closes_raw, min(50, len(closes_raw)))[-1]
        ma_fast_3h = round(ema20_equiv, 2)
        ma_slow_3h = round(ema50_equiv, 2)
    else:
        ema20_3h = calculate_ema_series(closes_3h, min(14, len(closes_3h)))[-1]
        ema50_3h = calculate_ema_series(closes_3h, min(28, len(closes_3h)))[-1]
        ma_fast_3h = round(ema20_3h, 2)
        ma_slow_3h = round(ema50_3h, 2)

    # Institutional 3-Hour Trend Logic
    if ma_fast_3h > ma_slow_3h and current_price >= (ma_slow_3h * 0.995):
        trend = "BULLISH"
        bias = "LONG_ONLY"
        description = f"Tendencia 3H ALCISTA (EMA20: ${ma_fast_3h:,.2f} > EMA50: ${ma_slow_3h:,.2f}). Solo se permiten COMPRAS en retrocesos."
    elif ma_fast_3h < ma_slow_3h and current_price <= (ma_slow_3h * 1.005):
        trend = "BEARISH"
        bias = "SHORT_ONLY"
        description = f"Tendencia 3H BAJISTA (EMA20: ${ma_fast_3h:,.2f} < EMA50: ${ma_slow_3h:,.2f}). Solo se permiten VENTAS en retrocesos."
    else:
        trend = "NEUTRAL"
        bias = "HOLD"
        description = f"Tendencia 3H LATERAL / INDEFINIDA. Prohibida la entrada sin dirección clara."

    return {
        "symbol": sym,
        "trend": trend,
        "bias": bias,
        "ma_fast_3h": ma_fast_3h,
        "ma_slow_3h": ma_slow_3h,
        "current_price": current_price,
        "description": description,
    }


def check_trade_signal(
    df: pd.DataFrame,
    buy_threshold: int = 35,
    sell_threshold: int = 65,
    symbol: Optional[str] = None,
) -> str:
    """Evaluates multi-factor institutional confluence:
    1. Circuit Breaker: Max 2 daily losses allowed.
    2. 3-Hour Macro Trend Alignment (Only LONG in 3H Bullish, Only SHORT in 3H Bearish).
    3. Lower Timeframe Pullback to EMA 20 + RSI Accumulation/Distribution + Rejection Candle.
    """
    # 1. Circuit Breaker check
    allowed, reason = daily_risk_guardian.is_trading_allowed()
    if not allowed:
        logger.info(f"Signal rejected: {reason}")
        return "HOLD"

    if len(df) < 5:
        return "HOLD"

    last_row = df.iloc[-1]
    rsi = float(last_row.get("rsi", 50.0))
    ma_fast = float(last_row.get("ma_fast", 0.0))
    ma_slow = float(last_row.get("ma_slow", 0.0))
    close = float(last_row.get("close", 0.0))
    open_p = float(last_row.get("open", close))

    if ma_fast == 0.0 or ma_slow == 0.0:
        return "HOLD"

    # 2. 3-Hour Macro Trend Alignment Check
    trend_3h = "BULLISH" if ma_fast > ma_slow else "BEARISH"
    if symbol:
        try:
            info_3h = get_3hour_trend(symbol)
            trend_3h = info_3h.get("trend", trend_3h)
        except Exception as e:
            logger.warning(f"Could not compute 3H trend for {symbol}: {e}")

    # Candlestick and Pullback Logic
    dist_from_fast = abs(close - ma_fast) / ma_fast if ma_fast > 0 else 0
    is_bullish_bar = close >= open_p
    is_bearish_bar = close <= open_p

    # ── High-Probability Bullish Setup (Mandatory 3H Trend Alignment) ──
    if trend_3h == "BULLISH" and dist_from_fast < 0.008:
        if (30 <= rsi <= max(buy_threshold, 52)) and is_bullish_bar:
            return "BUY"

    # ── High-Probability Bearish Setup (Mandatory 3H Trend Alignment) ──
    if trend_3h == "BEARISH" and dist_from_fast < 0.008:
        if (min(sell_threshold, 48) <= rsi <= 70) and is_bearish_bar:
            return "SELL"

    return "HOLD"
