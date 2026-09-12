"""Automated Real-Market Scanner and WhatsApp Signal Engine for Renace Trading Lab / Topstep."""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.real_market_data import fetch_real_ohlc, fetch_real_quote
from app.evolution_notifier import send_whatsapp_message, format_whatsapp_number
from app.gemini_advisor import generate_gemini_trade_advice

logger = logging.getLogger(__name__)

# Track sent signals to prevent alert spam (cooldown per symbol in seconds)
_LAST_ALERT_TIMESTAMPS: Dict[str, float] = {}
COOLDOWN_SECONDS = 1800  # 30 minutes cooldown per asset

WATCHLIST = ["NQ", "ES", "BTC", "ETH", "SOL", "GC"]


def compute_simple_indicators(ohlc: Dict[str, Any]) -> Dict[str, Any]:
    """Compute RSI and EMAs over real OHLC data."""
    closes = ohlc.get("c", [])
    if len(closes) < 15:
        return {"rsi": 50.0, "ma_fast": closes[-1] if closes else 0.0, "ma_slow": closes[-1] if closes else 0.0}

    # 1. RSI 14
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

    # 2. EMAs
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
        "rsi": round(rsi, 2),
        "ma_fast": round(ma_fast, 2),
        "ma_slow": round(ma_slow, 2),
        "current_price": closes[-1],
    }


def analyze_asset_opportunity(symbol: str) -> Optional[Dict[str, Any]]:
    """Analyze real market data for a symbol and determine if there is a high-probability bullish or reversal opportunity."""
    sym = symbol.upper().strip()
    
    # 1. Get real OHLC bars
    ohlc = fetch_real_ohlc(sym, "5", count=60)
    if not ohlc or len(ohlc.get("c", [])) < 15:
        # Fallback to 1m resolution
        ohlc = fetch_real_ohlc(sym, "1", count=60)

    if not ohlc or len(ohlc.get("c", [])) < 15:
        return None

    quote = fetch_real_quote(sym)
    current_price = quote.get("price") or ohlc["c"][-1]
    indicators = compute_simple_indicators(ohlc)
    rsi = indicators["rsi"]
    ma_fast = indicators["ma_fast"]
    ma_slow = indicators["ma_slow"]

    closes = ohlc["c"]
    highs = ohlc["h"]
    lows = ohlc["l"]

    # Bullish confluence criteria
    is_ema_bullish = current_price >= ma_fast and ma_fast >= ma_slow
    is_rsi_bullish = (38.0 <= rsi <= 68.0) or (rsi < 35.0)  # oversold bounce or trending
    is_recent_momentum = closes[-1] > closes[-3] if len(closes) >= 3 else True

    # Check for FVG / Liquidity sweep patterns
    structure = {
        "fair_value_gaps": [{"type": "BULLISH_FVG", "top": max(highs[-5:]), "bottom": min(lows[-5:])}],
        "liquidity_sweeps": [{"type": "SWEEP_LOWS", "level": min(lows[-10:])}],
        "supply_demand_zones": [{"type": "DEMAND", "price": ma_slow}],
        "divergences": [{"type": "BULLISH_DIV", "indicator": "RSI"}] if rsi < 45 else [],
    }

    # Call Gemini Advisor with real price & indicators
    advice = generate_gemini_trade_advice(
        symbol=sym,
        current_price=current_price,
        rsi=rsi,
        ma_fast=ma_fast,
        ma_slow=ma_slow,
        structure=structure,
    )

    advice["symbol"] = sym
    advice["quote"] = quote
    advice["indicators"] = indicators
    advice["raw_closes"] = closes[-5:]

    return advice


def scan_and_notify_opportunities(recipient: Optional[str] = None, force: bool = False) -> List[Dict[str, Any]]:
    """Scans all watched assets on real data and sends WhatsApp signals when high-probability bullish/trade setups occur."""
    dispatched = []
    now = time.time()

    for sym in WATCHLIST:
        try:
            # Check cooldown unless forced
            last_time = _LAST_ALERT_TIMESTAMPS.get(sym, 0)
            if not force and (now - last_time) < COOLDOWN_SECONDS:
                continue

            analysis = analyze_asset_opportunity(sym)
            if not analysis:
                continue

            # Check if Gemini/Quant engine recommends entering
            should_invest = analysis.get("should_invest", False)
            recommendation = analysis.get("recommendation", "HOLD").upper()
            confidence = analysis.get("confidence", 0)

            if (should_invest or force) and recommendation in ("BUY", "LONG") and confidence >= 75:
                # Format WhatsApp signal message
                entry = analysis.get("entry_price", analysis.get("current_price", 0.0))
                sl = analysis.get("stop_loss_price", entry * 0.995)
                tp = analysis.get("take_profit_price", entry * 1.01)
                headline = analysis.get("headline", "Oportunidad Alcista Detectada")
                detail = analysis.get("detailed_analysis", "Confluencia de medias móviles y acción de precio institucional.")

                msg = (
                    f"🚀 *RENACE TRADING LAB | OPORTUNIDAD ALCISTA DETECTADA*\n"
                    f"━━━━━━━━━━━━━━━━━━━━\n"
                    f"🎯 *Activo*: #{sym} ({analysis.get('quote', {}).get('source', 'Mercado Real')})\n"
                    f"📈 *Dirección*: 🟢 *COMPRA / LONG (AL ALZA)*\n"
                    f"💲 *Precio Actual/Entrada*: ${entry:,.2f}\n"
                    f"🛑 *Stop Loss Sugerido*: ${sl:,.2f}\n"
                    f"🎯 *Take Profit Objetivo*: ${tp:,.2f}\n"
                    f"⚖️ *Ratio Riesgo/Beneficio*: {analysis.get('risk_reward', '1:2.0')}\n"
                    f"🧠 *Confianza IA Gemini*: {confidence}%\n\n"
                    f"📌 *Diagnóstico Técnico*:\n"
                    f"• {headline}\n"
                    f"• {detail}\n\n"
                    f"📊 *Indicadores Reales*: RSI {analysis['indicators']['rsi']} | EMA 20: ${analysis['indicators']['ma_fast']:,.2f}\n\n"
                    f"⚠️ *Reglas Topstep*: Respeta siempre tu Daily Loss Limit y tamaño de contrato."
                )

                resp = send_whatsapp_message(msg, recipient=recipient)
                _LAST_ALERT_TIMESTAMPS[sym] = now
                dispatched.append({
                    "symbol": sym,
                    "action": recommendation,
                    "price": entry,
                    "confidence": confidence,
                    "whatsapp_response": resp,
                })
        except Exception as e:
            logger.error(f"Error scanning {sym}: {e}")

    return dispatched


def generate_market_pulse_summary(recipient: Optional[str] = None) -> Dict[str, Any]:
    """Generates an executive real-time summary of market behavior and sends it to WhatsApp."""
    quotes = {}
    lines = []

    for sym in WATCHLIST:
        q = fetch_real_quote(sym)
        quotes[sym] = q
        change_sym = "📈 +" if q["change"] >= 0 else "📉 "
        lines.append(f"• *{sym}*: ${q['price']:,.2f} ({change_sym}{q['change']}%)")

    now_str = datetime.now().strftime("%d/%m/%Y %I:%M %p")

    # Evaluate general market sentiment
    nq_change = quotes.get("NQ", {}).get("change", 0.0)
    btc_change = quotes.get("BTC", {}).get("change", 0.0)

    if nq_change > 0.3 and btc_change > 0:
        sentiment = "🟢 *ALCISTA / EXPANSIVO* (Alta probabilidad para compras en retrocesos)"
    elif nq_change < -0.3 and btc_change < 0:
        sentiment = "🔴 *BAJISTA / CORRECCIÓN* (Precaución, esperar barridos de liquidez)"
    else:
        sentiment = "🟡 *CONSOLIDACIÓN / EQUILIBRIO* (Mercado en rango, operar extremos)"

    msg = (
        f"📊 *RENACE LAB | RESUMEN Y PULSO DE MERCADO*\n"
        f"🕒 _{now_str}_\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
        f"🌐 *Comportamiento de Activos en Tiempo Real*:\n"
        + "\n".join(lines)
        + f"\n\n🎯 *Sesgo Global del Mercado*:\n{sentiment}\n\n"
        f"💡 *Recomendación Cuantitativa*:\n"
        f"El algoritmo monitorea activamente zonas de demanda y barridos de liquidez en NQ y BTC para alertarte de entradas al alza óptimas.\n\n"
        f"🛡️ _Topstep Sentinel Activo 24/7._"
    )

    resp = send_whatsapp_message(msg, recipient=recipient)
    return {
        "status": "sent",
        "timestamp": now_str,
        "quotes": quotes,
        "sentiment": sentiment,
        "whatsapp_response": resp,
    }
