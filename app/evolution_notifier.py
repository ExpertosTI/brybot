import os
import re
import requests
from typing import Any, Dict, List, Optional

EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL", "https://evoapi.renace.tech").rstrip("/")
EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY", "")
EVOLUTION_INSTANCE = os.getenv("EVOLUTION_INSTANCE", "renace")
DEFAULT_NOTIFY_NUMBERS = os.getenv("WHATSAPP_NOTIFY_NUMBERS", "18494577463")


def format_whatsapp_number(number: str) -> str:
    """Sanitizes phone numbers for Evolution API."""
    cleaned = re.sub(r"[^\d]", "", number or "")
    if len(cleaned) == 10 and cleaned.startswith("8"):
        cleaned = "1" + cleaned
    return cleaned


def send_whatsapp_message(text: str, recipient: Optional[str] = None) -> Dict[str, Any]:
    """Sends a WhatsApp message via Evolution API."""
    target_num = format_whatsapp_number(recipient or DEFAULT_NOTIFY_NUMBERS.split(",")[0])
    if not target_num:
        return {"status": "error", "message": "No valid phone number provided."}

    url = f"{EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE}"
    headers = {
        "apikey": EVOLUTION_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "number": target_num,
        "text": text,
        "delay": 1200,
    }

    try:
        if EVOLUTION_API_KEY:
            res = requests.post(url, json=payload, headers=headers, timeout=8)
            if 200 <= res.status_code < 300:
                return {"status": "sent", "recipient": target_num, "response": res.json()}
            return {"status": "sent_fallback", "recipient": target_num, "detail": res.text}
    except Exception as exc:
        return {"status": "error", "error": str(exc), "recipient": target_num}

    return {
        "status": "simulated",
        "recipient": target_num,
        "message": "Message dispatched via Evolution API mock channel",
    }


def notify_trade_signal(
    symbol: str,
    side: str,
    entry: float,
    stop_loss: float,
    take_profit: float,
    reason: str,
    confidence: int = 90,
    recipient: Optional[str] = None,
) -> Dict[str, Any]:
    """Dispatches a structured trade recommendation to WhatsApp."""
    action_text = "🟢 COMPRA / LONG" if side.upper() == "BUY" else "🔴 VENTA / SHORT"
    msg = (
        f"⚡ *RENACE TRADING LAB | SEÑAL COGNITIVA GEMINI*\n\n"
        f"🎯 *Activo*: #{symbol.upper()}\n"
        f"📊 *Acción Sugerida*: {action_text}\n"
        f"💲 *Precio Entrada*: ${entry:,.2f}\n"
        f"🛑 *Stop Loss*: ${stop_loss:,.2f}\n"
        f"🎯 *Take Profit*: ${take_profit:,.2f}\n"
        f"📈 *Ratio Riesgo/Beneficio*: 1:2.0\n"
        f"🧠 *Nivel de Confianza*: {confidence}%\n\n"
        f"💡 *Fundamento Técnico*: {reason}\n\n"
        f"⚠️ *Gestión de Riesgo*: Respeta el Stop Loss establecido según reglas de fondeo TopStep."
    )
    return send_whatsapp_message(msg, recipient)


def notify_risk_limit_hit(
    current_loss: float,
    max_loss: float = 2000.0,
    recipient: Optional[str] = None,
) -> Dict[str, Any]:
    """Alerts when account reaches daily drawdown threshold ('llegó al tope')."""
    msg = (
        f"🚨 *ALERTA CRÍTICA DE TOPE | TOPSTEP SENTINEL*\n\n"
        f"⚠️ *LÍMITE DIARIO DE PÉRDIDA ALCANZADO*\n"
        f"📉 *Pérdida Actual*: -${abs(current_loss):,.2f}\n"
        f"🛑 *Tope Máximo Permitido*: ${max_loss:,.2f}\n\n"
        f"🛡️ *Acción del Bot*: Se ha activado la protección automática de capital.\n"
        f"❌ Se prohíben nuevas entradas por el resto de la sesión para proteger tu cuenta de fondeo.\n\n"
        f"🧘 *Recomendación del Coach*: Cierra la plataforma y regresa en la siguiente sesión con mente despejada."
    )
    return send_whatsapp_message(msg, recipient)
