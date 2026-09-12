"""Automated Real-Market Scanner and Concise WhatsApp Intelligence Engine for Renace Trading Lab."""
from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.real_market_data import fetch_real_ohlc, fetch_real_quote
from app.evolution_notifier import send_whatsapp_message
from app.gemini_advisor import generate_gemini_trade_advice

logger = logging.getLogger(__name__)

# State to prevent repetitive spam
_LAST_DISPATCHED_HASH: str = ""
_LAST_DISPATCH_TIME: float = 0
MIN_CYCLE_INTERVAL = 280  # ~5 minutes minimum interval between automated broadcasts

CORE_WATCHLIST = ["NQ", "ES", "BTC", "GC", "SOL"]


def compute_simple_indicators(ohlc: Dict[str, Any]) -> Dict[str, Any]:
    """Compute RSI and EMAs over real OHLC data."""
    closes = ohlc.get("c", [])
    if len(closes) < 15:
        return {"rsi": 50.0, "ma_fast": closes[-1] if closes else 0.0, "ma_slow": closes[-1] if closes else 0.0}

    gains, losses = [], []
    for i in range(1, len(closes)):
        diff = closes[i] - closes[i - 1]
        if diff >= 0:
            gains.append(diff)
            losses.append(0.0)
        else:
            gains.append(0.0)
            losses.append(abs(diff))

    period = min(14, len(gains))
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period

    if avg_loss == 0:
        rsi = 100.0
    else:
        rs = avg_gain / avg_loss
        rsi = 100.0 - (100.0 / (1.0 + rs))

    def calculate_ema(data: List[float], n: int) -> float:
        if len(data) < n:
            return sum(data) / len(data)
        multiplier = 2.0 / (n + 1)
        ema = sum(data[:n]) / n
        for price in data[n:]:
            ema = (price - ema) * multiplier + ema
        return ema

    ma_fast = calculate_ema(closes, min(20, len(closes)))
    ma_slow = calculate_ema(closes, min(50, len(closes)))

    return {
        "rsi": round(rsi, 1),
        "ma_fast": round(ma_fast, 2),
        "ma_slow": round(ma_slow, 2),
        "current_price": closes[-1],
    }


def scan_and_notify_opportunities(recipient: Optional[str] = None, force: bool = False) -> List[Dict[str, Any]]:
    """Scans watchlist assets and dispatches ONE single, concise 5-minute summary with anti-spam check."""
    global _LAST_DISPATCHED_HASH, _LAST_DISPATCH_TIME
    now = time.time()

    if not force and (now - _LAST_DISPATCH_TIME) < MIN_CYCLE_INTERVAL:
        return []

    from app.strategy import get_3hour_trend, daily_risk_guardian

    risk_allowed, risk_reason = daily_risk_guardian.is_trading_allowed()
    risk_status = daily_risk_guardian.get_status()

    quotes = {}
    trends_3h = {}
    best_opportunity = None
    highest_confidence = 0

    for sym in CORE_WATCHLIST:
        try:
            q = fetch_real_quote(sym)
            quotes[sym] = q

            trend_info = get_3hour_trend(sym)
            trends_3h[sym] = trend_info.get("trend", "NEUTRAL")

            # Check if this asset has an actionable trade setup respecting 3H Trend and Daily Loss Limit
            if risk_allowed and trend_info.get("trend") in ("BULLISH", "BEARISH"):
                ohlc = fetch_real_ohlc(sym, "5", count=40) or fetch_real_ohlc(sym, "1", count=40)
                if ohlc and len(ohlc.get("c", [])) >= 15:
                    indicators = compute_simple_indicators(ohlc)
                    rsi = indicators["rsi"]
                    price = q.get("price", ohlc["c"][-1])

                    is_3h_bull = trend_info.get("trend") == "BULLISH"
                    is_3h_bear = trend_info.get("trend") == "BEARISH"

                    # 3H Bullish Pullback or 3H Bearish Pullback
                    setup_valid = False
                    if is_3h_bull and (30 <= rsi <= 52) and price >= indicators["ma_fast"] * 0.995:
                        setup_valid = True
                    elif is_3h_bear and (48 <= rsi <= 70) and price <= indicators["ma_fast"] * 1.005:
                        setup_valid = True

                    if setup_valid:
                        advice = generate_gemini_trade_advice(
                            symbol=sym,
                            current_price=price,
                            rsi=rsi,
                            ma_fast=indicators["ma_fast"],
                            ma_slow=indicators["ma_slow"],
                        )
                        conf = advice.get("confidence", 75)
                        rec = advice.get("recommendation", "HOLD")

                        if conf > highest_confidence and (
                            (is_3h_bull and rec in ("BUY", "LONG")) or (is_3h_bear and rec in ("SELL", "SHORT"))
                        ):
                            highest_confidence = conf
                            best_opportunity = {
                                "symbol": sym,
                                "side": rec,
                                "price": price,
                                "sl": advice.get("stop_loss_price", price * 0.996 if is_3h_bull else price * 1.004),
                                "tp": advice.get("take_profit_price", price * 1.008 if is_3h_bull else price * 0.992),
                                "confidence": conf,
                                "trend_3h": trend_info.get("trend"),
                                "reason": advice.get("headline", f"Confluencia Tendencia 3H {trend_info.get('trend')} + Mitigación FVG"),
                            }
        except Exception as e:
            logger.warning(f"Scan check error for {sym}: {e}")

    # Build concise 1-page summary
    time_str = datetime.now().strftime("%I:%M %p")
    lines = []
    for sym in CORE_WATCHLIST:
        q = quotes.get(sym, {})
        p = q.get("price", 0.0)
        t3h = trends_3h.get(sym, "NEUTRAL")
        arrow = "🟢" if t3h == "BULLISH" else ("🔴" if t3h == "BEARISH" else "⚪")
        t_label = "3H ALC" if t3h == "BULLISH" else ("3H BAJ" if t3h == "BEARISH" else "3H LAT")
        price_fmt = f"${p:,.2f}" if p < 10000 else f"${p:,.0f}"
        lines.append(f"• *{sym}*: {price_fmt} ({arrow} {t_label})")

    opp_block = ""
    if not risk_allowed:
        opp_block = (
            f"\n🛑 *CIRCUIT BREAKER ACTIVO*:\n"
            f"⚠️ Límite de {risk_status['max_allowed_losses']} pérdidas diarias alcanzado ({risk_status['daily_loss_count']}/{risk_status['max_allowed_losses']}).\n"
            f"🔒 Entradas bloqueadas para proteger plusvalía.\n"
        )
    elif best_opportunity:
        bo = best_opportunity
        p_fmt = f"${bo['price']:,.2f}" if bo['price'] < 10000 else f"${bo['price']:,.0f}"
        sl_fmt = f"${bo['sl']:,.2f}" if bo['sl'] < 10000 else f"${bo['sl']:,.0f}"
        tp_fmt = f"${bo['tp']:,.2f}" if bo['tp'] < 10000 else f"${bo['tp']:,.0f}"
        side_tag = "COMPRA / LONG" if bo["side"] in ("BUY", "LONG") else "VENTA / SHORT"
        side_icon = "🟢" if bo["side"] in ("BUY", "LONG") else "🔴"
        opp_block = (
            f"\n🎯 *Oportunidad Top ({bo['confidence']}% Conf.)*:\n"
            f"{side_icon} *{side_tag} #{bo['symbol']}* @ {p_fmt}\n"
            f"🛑 SL: {sl_fmt} | 🏁 TP: {tp_fmt} (R:R 1:2.0)\n"
            f"💡 _{bo['reason']}_\n"
        )
    else:
        opp_block = "\n🎯 *Estado*: Esperando retroceso óptimo alineado a Tendencia 3H.\n"

    loss_str = f"{risk_status['daily_loss_count']}/{risk_status['max_allowed_losses']}"
    msg = (
        f"⚡ *RENACE LAB | PULSO 3H & 5M*\n"
        f"🕒 _{time_str} · En Vivo_\n\n"
        f"📊 *Tendencias 3H & Precios*:\n"
        + "\n".join(lines)
        + opp_block
        + f"\n🛡️ _Pérdidas Hoy: {loss_str} permitidas | Centinela -$2,000_"
    )

    # Anti-spam check: do not send if the summary content is identical
    content_hash = f"{[quotes[s].get('price') for s in CORE_WATCHLIST]}_{best_opportunity is not None}"
    if not force and content_hash == _LAST_DISPATCHED_HASH:
        return []

    resp = send_whatsapp_message(msg, recipient=recipient)
    _LAST_DISPATCHED_HASH = content_hash
    _LAST_DISPATCH_TIME = now

    return [{
        "status": "summary_sent",
        "timestamp": time_str,
        "best_opportunity": best_opportunity,
        "whatsapp_response": resp,
    }]


def generate_market_pulse_summary(recipient: Optional[str] = None) -> Dict[str, Any]:
    """Manually triggers the concise executive 5-minute market pulse summary."""
    results = scan_and_notify_opportunities(recipient=recipient, force=True)
    return {
        "status": "sent",
        "timestamp": datetime.now().strftime("%I:%M %p"),
        "results": results,
    }
