import logging
import os
from fastapi import APIRouter
from app.auth import get_session_token
from app.projectx import get_all_contracts

router = APIRouter()
logger = logging.getLogger(__name__)


def _fallback_contracts():
    """Provide a small set of recognizable contracts when API auth is unavailable."""
    fallback_env = os.getenv("FALLBACK_CONTRACTS", "ES,NQ,YM,CL,GC")
    return [symbol.strip() for symbol in fallback_env.split(",") if symbol.strip()]

@router.get("/contracts")
def list_contracts():
    """Return a list of available contract symbols."""
    try:
        token = get_session_token()
        contracts = get_all_contracts(token)
        symbols = [c.get("name") for c in contracts if c.get("name")]
        if symbols:
            return {"contracts": symbols, "source": "topstep"}

        logger.warning("Topstep returned no contracts; using fallback list")
        return {"contracts": _fallback_contracts(), "source": "fallback"}
    except Exception as e:
        logger.error("Failed to load contracts; using fallback list: %s", e)
        return {"contracts": _fallback_contracts(), "source": "fallback", "error": str(e)}
