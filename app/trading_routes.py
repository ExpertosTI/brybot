# app/trading_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime
import os, csv
from sqlalchemy.orm import Session

from app import database, models
from app.auth_routes import get_current_user_model
from app.integrations_service import env_fallback_enabled, env_topstepx_credentials, resolve_integration
from app.providers.factory import get_adapter
from app.providers.topstepx import TopStepXAdapter
from app.providers.types import IntegrationCapability, IntegrationProvider, PROVIDER_CAPABILITIES

router = APIRouter()

LOG_PATH = os.path.join("logs", "trades.csv")
os.makedirs("logs", exist_ok=True)

class TradingSignal(BaseModel):
    symbol: str
    side: str  # "BUY" | "SELL"
    quantity: int
    signal_integration_id: int | None = None
    broker_integration_id: int | None = None
    secret: str | None = None

@router.get("/test-trade")
async def test_trade(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_model),
):
    integration = resolve_integration(
        db,
        current_user.id,
        required_capabilities={IntegrationCapability.BROKER_TRADING},
    )
    if not integration:
        raise HTTPException(status_code=400, detail="No active broker integration configured.")
    adapter = get_adapter(integration)
    return await adapter.place_order({"symbol": "NQU5", "side": "BUY", "quantity": 1})

@router.post("/webhook")
async def receive_signal(
    signal: TradingSignal,
    db: Session = Depends(database.get_db),
):
    with open(LOG_PATH, "a", newline="") as f:
        csv.writer(f).writerow([datetime.now(), signal.symbol, signal.side, signal.quantity])

    if not signal.signal_integration_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="signal_integration_id is required for webhook routing.",
        )

    signal_integration = (
        db.query(models.PlatformIntegration)
        .filter(models.PlatformIntegration.id == signal.signal_integration_id)
        .first()
    )
    if not signal_integration:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Signal integration not found.")
    if signal_integration.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Signal integration is not active.")

    try:
        signal_provider = IntegrationProvider(signal_integration.provider)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported signal provider.") from exc
    if IntegrationCapability.SIGNALS not in PROVIDER_CAPABILITIES.get(signal_provider, set()):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Integration does not support signals.")

    signal_adapter = get_adapter(signal_integration)
    if hasattr(signal_adapter, "validate_webhook_secret"):
        if not signal_adapter.validate_webhook_secret(signal.secret):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook secret.")

    broker_integration = resolve_integration(
        db,
        signal_integration.user_id,
        integration_id=signal.broker_integration_id,
        required_capabilities={IntegrationCapability.BROKER_TRADING},
    )
    adapter = None
    if broker_integration:
        adapter = get_adapter(broker_integration)
    elif env_fallback_enabled():
        env_credentials = env_topstepx_credentials()
        if env_credentials:
            adapter = TopStepXAdapter(env_credentials, {})

    if not adapter:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active broker integration configured for execution.",
        )

    result = await adapter.place_order(
        {"symbol": signal.symbol, "side": signal.side, "quantity": signal.quantity}
    )
    return {"status": "received", "result": result}
