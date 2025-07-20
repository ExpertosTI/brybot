from fastapi import APIRouter, HTTPException
from app.auth import get_session_token
from projectx import get_all_contracts

router = APIRouter()

@router.get("/contracts")
def list_contracts():
    """Return a list of available contract symbols."""
    try:
        token = get_session_token()
        contracts = get_all_contracts(token)
        symbols = [c.get("name") for c in contracts if c.get("name")]
        return {"contracts": symbols}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
