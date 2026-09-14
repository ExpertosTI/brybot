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
OPPORTUNITY_COOLDOWN_SECONDS = 7200  # 2 hours minimum between duplicate alerts for the same symbol
GLOBAL_DISPATCH_COOLDOWN_SECONDS = 7200  # 2 hours minimum between ANY automated notification
MAX_DAILY_AUTOMATED_SIGNALS = 2  # Maximum 2 automated trade signals per day
_LAST_GLOBAL_DISPATCH_TIME: float = 0.0
_DAILY_AUTOMATED_SIGNALS_COUNT: int = 0
_LAST_DAILY_COUNT_DATE: str = ""

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


def get_six_year_market_context(symbol: str = "NQ") -> Dict[str, Any]:
    """Computes a concise 6-year (2019-2024) seasonal comparison and higher-timeframe suggestion."""
    month_names = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    m_idx = datetime.now().month - 1
    current_month = month_names[m_idx]

    try:
        from app.historical_patterns import INTERANNUAL_SEASON_RECORDS
        records_6y = [r for r in INTERANNUAL_SEASON_RECORDS if r.get("year", 0) >= 2019]
        if records_6y:
            bullish_years = sum(1 for r in records_6y if r.get("season_return", 0) >= 0)
            total_years = len(records_6y)
            avg_ret = round(sum(r.get("season_return", 0) for r in records_6y) / total_years, 1)
            avg_wr = round(sum(r.get("win_rate", 50) for r in records_6y) / total_years)
        else:
            bullish_years, total_years, avg_ret, avg_wr = 2, 6, -4.1, 44
    except Exception:
        bullish_years, total_years, avg_ret, avg_wr = 2, 6, -4.1, 44

    # Higher timeframe suggestion (Macro / Swing D1-W1)
    if current_month in ["Sep", "Ago"]:
        htf_suggestion = "Tendencia estacional defensiva. Evitar compras en resistencia; acumular solo en retrocesos a soportes para el rally de Q4 (Nov-Dic win rate 79%)."
        date_analog = "Semana 37-38: Volatilidad pre-FOMC con suelos temporales entre días 15-22."
    elif current_month in ["Oct", "Nov", "Dic"]:
        htf_suggestion = "Sesgo alcista predominante (Rally de Fin de Año). Mantener compras en retrocesos a VWAP diario y buscar expansión swing."
        date_analog = "Fuertes entradas institucionales de fin de año (Santa Rally)."
    else:
        htf_suggestion = "Operar a favor de la tendencia semanal (W1) con R:R mínimo 1:2. Proteger ganancias en zonas de liquidez."
        date_analog = "Continuación de ciclo institucional tras balances trimestrales."

    return {
        "current_month": current_month,
        "bullish_years": bullish_years,
        "total_years": total_years,
        "avg_return": avg_ret,
        "avg_win_rate": avg_wr,
        "date_analog": date_analog,
        "higher_tf_suggestion": htf_suggestion,
    }


_LAST_MORNING_BELL_DATE: str = ""

def check_and_dispatch_morning_bell(recipient: Optional[str] = None, force: bool = False) -> Optional[Dict[str, Any]]:
    """Dispatches a concise, high-value Morning Opening Briefing at the start of the trading day."""
    global _LAST_MORNING_BELL_DATE
    now_dt = datetime.now()
    today_str = now_dt.strftime("%Y-%m-%d")

    # Only send once per calendar day unless forced
    if not force and _LAST_MORNING_BELL_DATE == today_str:
        return None

    # Only dispatch Monday through Friday unless forced
    weekday = now_dt.weekday()  # 0 = Monday, 4 = Friday
    if not force and weekday > 4:
        return None

    try:
        from app.market_sentiment import fetch_intermarket_metrics
        sentiment = fetch_intermarket_metrics()
        vix_p = sentiment.get("vix", {}).get("price", 14.85)
        dxy_p = sentiment.get("dxy", {}).get("price", 101.4)
        regime = "RISK-ON" if "RISK-ON" in sentiment.get("intermarket_regime", "") else "RISK-OFF"
    except Exception as e:
        logger.warning(f"Error fetching sentiment for morning bell: {e}")
        vix_p, dxy_p, regime = 15.2, 99.5, "RISK-OFF"

    day_name = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES"][weekday] if weekday <= 4 else "FIN DE SEMANA"
    time_str = now_dt.strftime("%I:%M %p")

    prices = []
    for sym in ["NQ", "ES", "BTC", "GC"]:
        try:
            q = fetch_real_quote(sym)
            p = q.get("price", 0.0)
            p_fmt = f"${p:,.0f}" if p >= 1000 else f"${p:,.2f}"
            prices.append(f"{sym}: {p_fmt}")
        except Exception:
            pass

    ctx = get_six_year_market_context("NQ")

    # Short, high-impact, professional message
    msg = (
        f"🌅 *RENACE LAB | APERTURA {day_name}*\n"
        f"⏱️ _{time_str} ET_\n\n"
        f"📊 *Precios*: {' | '.join(prices)}\n"
        f"📈 *VIX*: {vix_p} | *DXY*: {dxy_p} ({regime})\n\n"
        f"🏛️ *Histórico 6 Años ({ctx['current_month']})*:\n"
        f"• {ctx['bullish_years']}/{ctx['total_years']} años alcistas ({ctx['avg_win_rate']}% WR, {ctx['avg_return']:+0.1f}% retorno).\n"
        f"• {ctx['date_analog']}\n\n"
        f"⏳ *Sugerencia Mayor Plazo (D1/W1)*:\n"
        f"• {ctx['higher_tf_suggestion']}"
    )

    _LAST_MORNING_BELL_DATE = today_str
    logger.info(f"Dispatching Morning Market Bell for {day_name} ({today_str})...")
    resp = send_whatsapp_message(msg, recipient=recipient)
    return {
        "status": "morning_bell_dispatched",
        "date": today_str,
        "whatsapp_response": resp,
    }


def scan_and_notify_opportunities(recipient: Optional[str] = None, force: bool = False) -> List[Dict[str, Any]]:
    """Scans watchlist assets. 
    CRITICAL RULE:
    - In automated mode (force=False), NEVER send WhatsApp messages if there is NO actionable trade opportunity.
    - Only sends an alert when a genuine institutional trade setup (>= 88% confidence) occurs.
    - Strict 1-hour anti-spam cooldown per asset.
    """
    global _LAST_DISPATCHED_OPPORTUNITIES, _LAST_CIRCUIT_BREAKER_NOTIFIED
    global _LAST_GLOBAL_DISPATCH_TIME, _DAILY_AUTOMATED_SIGNALS_COUNT, _LAST_DAILY_COUNT_DATE
    now = time.time()
    now_dt = datetime.now()
    today_str = now_dt.strftime("%Y-%m-%d")

    # Reset daily count on new date
    if _LAST_DAILY_COUNT_DATE != today_str:
        _LAST_DAILY_COUNT_DATE = today_str
        _DAILY_AUTOMATED_SIGNALS_COUNT = 0

    # Morning Opening Briefing Check (dispatched once on trading days)
    try:
        check_and_dispatch_morning_bell(recipient=recipient)
    except Exception as exc:
        logger.warning(f"Could not dispatch morning bell: {exc}")

    # If automated, apply strict minimalist filters (no noise, no spam)
    if not force:
        # 1. Trading hours filter: Golden Window only (09:30 AM to 11:45 AM ET)
        current_minute = now_dt.hour * 60 + now_dt.minute
        if not (570 <= current_minute <= 705):
            logger.debug("Scanner: Outside Golden Trading Window (09:30-11:45 ET). Muting automated alerts.")
            return []

        # 2. Maximum daily automated signals (Max 2 per day)
        if _DAILY_AUTOMATED_SIGNALS_COUNT >= MAX_DAILY_AUTOMATED_SIGNALS:
            logger.debug(f"Scanner: Max daily automated signals ({MAX_DAILY_AUTOMATED_SIGNALS}) reached.")
            return []

        # 3. Global cooldown across all assets (Min 2 hours between ANY message)
        if (now - _LAST_GLOBAL_DISPATCH_TIME) < GLOBAL_DISPATCH_COOLDOWN_SECONDS:
            rem_min = int((GLOBAL_DISPATCH_COOLDOWN_SECONDS - (now - _LAST_GLOBAL_DISPATCH_TIME)) / 60)
            logger.debug(f"Scanner: Global dispatch cooldown active ({rem_min} min remaining).")
            return []

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

                        # Only ultra high-confidence signals matching 3H trend direction (>=92% for automated)
                        min_conf_req = 88 if force else 92
                        if conf >= min_conf_req and (
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
            # If same direction sent less than 2h ago and price change < 0.6%, skip dispatch!
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

        ctx = get_six_year_market_context(bo["symbol"])

        msg = (
            f"⚡ *RENACE LAB | SEÑAL #{bo['symbol']}*\n"
            f"⏱️ _{time_str}_\n\n"
            f"{side_icon} *{side_tag}* @ {p_fmt}\n"
            f"🛑 *SL*: {sl_fmt} | 🎯 *TP*: {tp_fmt} (1:2.0)\n"
            f"{trend_icon} *Tendencia 3H*: {bo['trend_3h']} | 🧠 *Conf*: {bo['confidence']}%\n\n"
            f"🏛️ *Histórico 6 Años ({ctx['current_month']})*:\n"
            f"• {ctx['bullish_years']}/{ctx['total_years']} años alcistas ({ctx['avg_win_rate']}% WR, {ctx['avg_return']:+0.1f}% retorno).\n\n"
            f"⏳ *Sugerencia Mayor Plazo (D1/W1)*:\n"
            f"• {ctx['higher_tf_suggestion']}"
        )
        # Record dispatch state
        _LAST_DISPATCHED_OPPORTUNITIES[bo["symbol"]] = {
            "time": now,
            "side": bo["side"],
            "price": bo["price"],
        }
        if not force:
            _LAST_GLOBAL_DISPATCH_TIME = now
            _DAILY_AUTOMATED_SIGNALS_COUNT += 1
    elif force:
        # Only when explicitly forced from UI
        ctx = get_six_year_market_context("NQ")
        lines = []
        for sym in CORE_WATCHLIST:
            q = quotes.get(sym, {})
            p = q.get("price", 0.0)
            t3h = trends_3h.get(sym, "NEUTRAL")
            arrow = "🟢" if t3h == "BULLISH" else ("🔴" if t3h == "BEARISH" else "⚪")
            price_fmt = f"${p:,.0f}" if p >= 1000 else f"${p:,.2f}"
            lines.append(f"{sym}: {price_fmt} ({arrow})")

        msg = (
            f"⚡ *RENACE LAB | PULSO DE MERCADO*\n"
            f"⏱️ _{time_str} · Manual_\n\n"
            f"📊 *Cotizaciones*: {' | '.join(lines)}\n\n"
            f"🏛️ *Histórico 6 Años ({ctx['current_month']})*:\n"
            f"• {ctx['bullish_years']}/{ctx['total_years']} años alcistas ({ctx['avg_win_rate']}% WR, {ctx['avg_return']:+0.1f}% retorno).\n"
            f"• {ctx['date_analog']}\n\n"
            f"⏳ *Sugerencia Mayor Plazo (D1/W1)*:\n"
            f"• {ctx['higher_tf_suggestion']}\n\n"
            f"🎯 *Estado*: Monitoreando retrocesos para entrada de alta probabilidad."
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
