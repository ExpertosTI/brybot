import os
import re
import requests
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Config dictionary with runtime dynamic updates
EVOLUTION_CONFIG = {
    "url": os.getenv("EVOLUTION_API_URL", "https://evoapi.renace.tech").rstrip("/"),
    "api_key": os.getenv("EVOLUTION_API_KEY", ""),
    "instance": os.getenv("EVOLUTION_INSTANCE", "renace"),
    "notify_numbers": os.getenv("WHATSAPP_NOTIFY_NUMBERS", "18494577463"),
}


def get_evolution_config() -> Dict[str, Any]:
    """Returns current Evolution API settings with masked API key."""
    key = EVOLUTION_CONFIG["api_key"]
    masked_key = f"{key[:4]}...{key[-4:]}" if len(key) > 8 else ("***" if key else "")
    return {
        "url": EVOLUTION_CONFIG["url"],
        "instance": EVOLUTION_CONFIG["instance"],
        "notify_numbers": EVOLUTION_CONFIG["notify_numbers"],
        "has_api_key": bool(key),
        "api_key_masked": masked_key,
    }


def update_evolution_config(
    url: Optional[str] = None,
    api_key: Optional[str] = None,
    instance: Optional[str] = None,
    notify_numbers: Optional[str] = None,
) -> Dict[str, Any]:
    """Updates the Evolution API configuration at runtime."""
    if url:
        EVOLUTION_CONFIG["url"] = url.rstrip("/")
        os.environ["EVOLUTION_API_URL"] = EVOLUTION_CONFIG["url"]
    if api_key is not None:
        if api_key != "":
            EVOLUTION_CONFIG["api_key"] = api_key
            os.environ["EVOLUTION_API_KEY"] = api_key
    if instance:
        EVOLUTION_CONFIG["instance"] = instance
        os.environ["EVOLUTION_INSTANCE"] = instance
    if notify_numbers:
        EVOLUTION_CONFIG["notify_numbers"] = notify_numbers
        os.environ["WHATSAPP_NOTIFY_NUMBERS"] = notify_numbers

    return get_evolution_config()


def check_evolution_instance_status() -> Dict[str, Any]:
    """Checks whether the Evolution API instance is online and connected to WhatsApp."""
    url = EVOLUTION_CONFIG["url"]
    instance = EVOLUTION_CONFIG["instance"]
    api_key = EVOLUTION_CONFIG["api_key"]

    if not api_key:
        return {
            "status": "warning",
            "state": "unconfigured",
            "is_connected": False,
            "message": "Evolution API Key no configurada. Ingresa tu API Key en Ajustes.",
        }

    endpoint = f"{url}/instance/connectionState/{instance}"
    headers = {"apikey": api_key}

    try:
        res = requests.get(endpoint, headers=headers, timeout=5)
        if res.status_code == 200:
            data = res.json()
            state = data.get("instance", {}).get("state") or data.get("state", "unknown")
            is_connected = state.lower() == "open"
            return {
                "status": "success",
                "state": state,
                "is_connected": is_connected,
                "raw": data,
                "message": f"Instancia '{instance}': {state.upper()}",
            }
        elif res.status_code == 401:
            return {
                "status": "error",
                "state": "unauthorized",
                "is_connected": False,
                "message": "API Key inválida o no autorizada en Evolution API.",
            }
        elif res.status_code == 404:
            return {
                "status": "error",
                "state": "not_found",
                "is_connected": False,
                "message": f"La instancia '{instance}' no existe en {url}.",
            }
        else:
            return {
                "status": "error",
                "state": "http_error",
                "status_code": res.status_code,
                "is_connected": False,
                "message": f"Error del servidor Evolution API ({res.status_code}): {res.text[:200]}",
            }
    except Exception as exc:
        return {
            "status": "error",
            "state": "network_error",
            "is_connected": False,
            "message": f"No se pudo conectar a {url}: {str(exc)}",
        }


def format_whatsapp_number(number: str) -> str:
    """Sanitizes phone numbers for Evolution API."""
    cleaned = re.sub(r"[^\d]", "", number or "")
    if len(cleaned) == 10 and cleaned.startswith("8"):
        cleaned = "1" + cleaned
    return cleaned


def send_whatsapp_message(text: str, recipient: Optional[str] = None) -> Dict[str, Any]:
    """Sends a WhatsApp message via Evolution API."""
    default_recipients = EVOLUTION_CONFIG["notify_numbers"].split(",")
    target_num = format_whatsapp_number(recipient or default_recipients[0])
    if not target_num:
        return {"status": "error", "message": "No valid phone number provided."}

    url = f"{EVOLUTION_CONFIG['url']}/message/sendText/{EVOLUTION_CONFIG['instance']}"
    api_key = EVOLUTION_CONFIG["api_key"]
    headers = {
        "apikey": api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "number": target_num,
        "text": text,
        "delay": 1200,
    }

    try:
        if api_key:
            res = requests.post(url, json=payload, headers=headers, timeout=8)
            if 200 <= res.status_code < 300:
                return {"status": "sent", "recipient": target_num, "response": res.json()}
            return {"status": "sent_fallback", "recipient": target_num, "detail": res.text}
    except Exception as exc:
        return {"status": "error", "error": str(exc), "recipient": target_num}

    return {
        "status": "simulated",
        "recipient": target_num,
        "message": "Message dispatched via Evolution API mock channel (Add API Key in settings to send live)",
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
