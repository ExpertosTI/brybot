import logging
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import database, models
from app.auth_routes import get_current_user_model
from app.integrations_service import env_fallback_enabled, env_topstepx_credentials, resolve_integration
from app.providers.factory import get_adapter
from app.providers.topstepx import TopStepXAdapter
from app.providers.types import IntegrationCapability, IntegrationProvider

router = APIRouter()
logger = logging.getLogger(__name__)


def _fallback_contracts():
    """Provide a small set of recognizable contracts when API auth is unavailable."""
    fallback_env = os.getenv("FALLBACK_CONTRACTS", "ES,NQ,YM,CL,GC")
    return [symbol.strip() for symbol in fallback_env.split(",") if symbol.strip()]


@router.get("/contracts")
async def list_contracts(
    integration_id: int | None = None,
    provider: IntegrationProvider | None = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_model),
):
    """Return a list of available contract symbols."""
    integration = resolve_integration(
        db,
        current_user.id,
        integration_id=integration_id,
        required_provider=provider,
        required_capabilities={IntegrationCapability.MARKET_DATA},
    )

    if not integration:
        if env_fallback_enabled():
            env_credentials = env_topstepx_credentials()
            if env_credentials:
                adapter = TopStepXAdapter(env_credentials, {})
                try:
                    contracts = await adapter.get_contracts()
                    symbols = [c.get("name") for c in contracts if c.get("name")]
                    return {"contracts": symbols or _fallback_contracts(), "source": "env"}
                except Exception as exc:
                    logger.warning("Env fallback contracts failed: %s", exc)
        return {
            "contracts": _fallback_contracts(),
            "source": "fallback",
            "message": "No active market data integration configured.",
        }

    adapter = get_adapter(integration)
    try:
        contracts = await adapter.get_contracts()
    except Exception as exc:
        logger.warning("Failed to load contracts: %s", exc)
        return {
            "contracts": _fallback_contracts(),
            "source": "fallback",
            "message": "Market data integration unavailable.",
        }
    symbols = [c.get("name") for c in contracts if c.get("name")]
    return {"contracts": symbols, "source": integration.provider.lower()}
