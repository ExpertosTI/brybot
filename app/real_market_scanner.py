"""Automated Real-Market Scanner and High-Precision Opportunity Alert Engine for Renace Trading Lab."""
from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.real_market_data import fetch_real_ohlc, fetch_real_quote
from app.evolution_notifier import send_whatsapp_message
from app.gemini_advisor import generate_gemini_trade_advice

logger = logging.getLogger(__name__)

# State for strict anti-spam & deduplication
_LAST_DISPATCHED_OPPORTUNITIES: Dict[str, Dict[str, Any]] = {}
_LAST_CIRCUIT_BREAKER_NOTIFIED: bool = False
OPPORTUNITY_COOLDOWN_SECONDS = 3600  # 1 hour minimum between duplicate alerts for the same symbol/direction

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
    """Scans watchlist assets. 
    CRITICAL RULE:
    - In automated mode (force=False), NEVER send WhatsApp messages if there is NO actionable trade opportunity.
    - Only sends an alert when a genuine institutional trade setup (>= 88% confidence) occurs.
    - Strict 1-hour anti-spam cooldown per asset.
    """
    global _LAST_DISPATCHED_OPPORTUNITIES, _LAST_CIRCUIT_BREAKER_NOTIFIED
    now = time.time()

    from app.strategy import get_3hour_trend, daily_risk_guardian

    risk_allowed, risk_reason = daily_risk_guardian.is_trading_allowed()
    risk_status = daily_risk_guardian.get_status()

    # If circuit breaker is triggered (2 losses), notify once and halt
    if not risk_allowed:
        if not _LAST_CIRCUIT_BREAKER_NOTIFIED and not force:
            _LAST_CIRCUIT_BREAKER_NOTIFIED = True
            logger.info("Daily loss limit active. No trade scans will be broadcast.")
        return []
    else:
        _LAST_CIRCUIT_BREAKER_NOTIFIED = False

    quotes = {}
    trends_3h = {}
    valid_opportunities: List[Dict[str, Any]] = []

    for sym in CORE_WATCHLIST:
        try:
            q = fetch_real_quote(sym)
            quotes[sym] = q

            trend_info = get_3hour_trend(sym)
            trends_3h[sym] = trend_info.get("trend", "NEUTRAL")

            # Must have clear 3-Hour Trend (BULLISH or BEARISH)
            if trend_info.get("trend") in ("BULLISH", "BEARISH"):
                ohlc = fetch_real_ohlc(sym, "5", count=40) or fetch_real_ohlc(sym, "1", count=40)
                if ohlc and len(ohlc.get("c", [])) >= 15:
                    indicators = compute_simple_indicators(ohlc)
                    rsi = indicators["rsi"]
                    price = q.get("price", ohlc["c"][-1])

                    is_3h_bull = trend_info.get("trend") == "BULLISH"
                    is_3h_bear = trend_info.get("trend") == "BEARISH"

                    # 3H Trend Pullback Confluence
                    setup_valid = False
                    if is_3h_bull and (30 <= rsi <= 50) and price >= indicators["ma_fast"] * 0.994:
                        setup_valid = True
                    elif is_3h_bear and (50 <= rsi <= 70) and price <= indicators["ma_fast"] * 1.006:
                        setup_valid = True

                    if setup_valid:
                        advice = generate_gemini_trade_advice(
                            symbol=sym,
                            current_price=price,
                            rsi=rsi,
                            ma_fast=indicators["ma_fast"],
                            ma_slow=indicators["ma_slow"],
                        )
                        conf = advice.get("confidence", 70)
                        rec = advice.get("recommendation", "HOLD")

                        # Only high-confidence signals matching 3H trend direction
                        if conf >= 88 and (
                            (is_3h_bull and rec in ("BUY", "LONG")) or (is_3h_bear and rec in ("SELL", "SHORT"))
                        ):
                            valid_opportunities.append({
                                "symbol": sym,
                                "side": rec,
                                "price": price,
                                "sl": advice.get("stop_loss_price", price * 0.996 if is_3h_bull else price * 1.004),
                                "tp": advice.get("take_profit_price", price * 1.008 if is_3h_bull else price * 0.992),
                                "confidence": conf,
                                "trend_3h": trend_info.get("trend"),
                                "reason": advice.get("headline", f"Mitigación FVG + Tendencia 3H {trend_info.get('trend')}"),
                            })
        except Exception as e:
            logger.warning(f"Scan check error for {sym}: {e}")

    # If NO real opportunity was found and this is an automated scan: DO NOT SEND ANY MESSAGE!
    if not valid_opportunities and not force:
        logger.debug("Scanner: No high-confluence opportunities at this time. Staying silent.")
        return []

    # Pick the best opportunity
    best_opportunity = None
    if valid_opportunities:
        valid_opportunities.sort(key=lambda x: x["confidence"], reverse=True)
        best_opportunity = valid_opportunities[0]

    # Check anti-spam cooldown for this specific asset & side
    if best_opportunity and not force:
        sym = best_opportunity["symbol"]
        side = best_opportunity["side"]
        last_disp = _LAST_DISPATCHED_OPPORTUNITIES.get(sym)
        if last_disp:
            last_time = last_disp.get("time", 0)
            last_side = last_disp.get("side")
            last_price = last_disp.get("price", 0)
            # If same direction sent less than 1h ago and price change < 0.6%, skip dispatch!
            price_change_ratio = abs(best_opportunity["price"] - last_price) / last_price if last_price > 0 else 1
            if (now - last_time) < OPPORTUNITY_COOLDOWN_SECONDS and last_side == side and price_change_ratio < 0.006:
                logger.info(f"Scanner: Skipping duplicate alert for {sym} ({side}) - cooldown active.")
                return []

    # Format the message
    time_str = datetime.now().strftime("%I:%M %p")
    msg = ""

    if best_opportunity:
        bo = best_opportunity
        p_fmt = f"${bo['price']:,.2f}" if bo['price'] < 10000 else f"${bo['price']:,.0f}"
        sl_fmt = f"${bo['sl']:,.2f}" if bo['sl'] < 10000 else f"${bo['sl']:,.0f}"
        tp_fmt = f"${bo['tp']:,.2f}" if bo['tp'] < 10000 else f"${bo['tp']:,.0f}"
        side_tag = "COMPRA / LONG" if bo["side"] in ("BUY", "LONG") else "VENTA / SHORT"
        side_icon = "🟢" if bo["side"] in ("BUY", "LONG") else "🔴"
        trend_icon = "🟢" if bo["trend_3h"] == "BULLISH" else "🔴"

        msg = (
            f"⚡ *RENACE LAB | SEÑAL DE TRADING*\n"
            f"🕒 _{time_str}_\n\n"
            f"{side_icon} *{side_tag} #{bo['symbol']}* @ {p_fmt}\n"
            f"🛑 *Stop Loss*: {sl_fmt}\n"
            f"🎯 *Take Profit*: {tp_fmt} (R:R 1:2.0)\n"
            f"{trend_icon} *Tendencia 3H*: {bo['trend_3h']}\n"
            f"🧠 *Confianza*: {bo['confidence']}%\n\n"
            f"💡 _{bo['reason']}_\n\n"
            f"🛡️ _Topstep Sentinel: Máx 2 pérdidas/día vigilado._"
        )
        # Record dispatch state
        _LAST_DISPATCHED_OPPORTUNITIES[bo["symbol"]] = {
            "time": now,
            "side": bo["side"],
            "price": bo["price"],
        }
    elif force:
        # Only when explicitly forced from UI
        lines = []
        for sym in CORE_WATCHLIST:
            q = quotes.get(sym, {})
            p = q.get("price", 0.0)
            t3h = trends_3h.get(sym, "NEUTRAL")
            arrow = "🟢" if t3h == "BULLISH" else ("🔴" if t3h == "BEARISH" else "⚪")
            t_label = "3H ALC" if t3h == "BULLISH" else ("3H BAJ" if t3h == "BEARISH" else "3H LAT")
            price_fmt = f"${p:,.2f}" if p < 10000 else f"${p:,.0f}"
            lines.append(f"• *{sym}*: {price_fmt} ({arrow} {t_label})")

        msg = (
            f"⚡ *RENACE LAB | PULSO DE MERCADO*\n"
            f"🕒 _{time_str} · Solicitud Manual_\n\n"
            f"📊 *Tendencias 3H & Precios*:\n"
            + "\n".join(lines)
            + "\n\n🎯 *Estado*: Mercado en consolidación. Esperando retroceso óptimo para disparar señal."
        )

    if not msg:
        return []

    resp = send_whatsapp_message(msg, recipient=recipient)
    return [{
        "status": "signal_dispatched" if best_opportunity else "pulse_dispatched",
        "timestamp": time_str,
        "best_opportunity": best_opportunity,
        "whatsapp_response": resp,
    }]


def generate_market_pulse_summary(recipient: Optional[str] = None) -> Dict[str, Any]:
    """Manually triggers an on-demand market check."""
    results = scan_and_notify_opportunities(recipient=recipient, force=True)
    return {
        "status": "sent",
        "timestamp": datetime.now().strftime("%I:%M %p"),
        "results": results,
    }
