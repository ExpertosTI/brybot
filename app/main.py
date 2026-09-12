from fastapi import FastAPI
from . import auth_routes, integrations_routes, models, database, scheduler, contracts
from . import analysis_routes
from .database import engine
from fastapi.middleware.cors import CORSMiddleware
from .trading_routes import router as trading_router
import os

import asyncio
from .tradovate_client import TradovateClient
from .tradovate_ws import TradovateWebSocketManager
from .tradovate_risk_manager import TradovateRiskManager

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Tradovate Integrations
tradovate_client = TradovateClient(env="demo")
tradovate_ws_manager = TradovateWebSocketManager(env="demo")
tradovate_risk_manager = TradovateRiskManager(tradovate_ws_manager, tradovate_client)

@app.on_event("startup")
async def startup_event():
    tradovate_risk_manager.start()
    asyncio.create_task(tradovate_ws_manager.start_trading_ws())
    asyncio.create_task(tradovate_ws_manager.start_md_ws(symbols=["MESZ6"]))

@app.get("/healthz", tags=["health"])
def healthcheck():
    return {"status": "ok"}

# ── CORS must be registered BEFORE routers ──────────────────────
cors_origins_env = os.getenv("CORS_ORIGINS")
if cors_origins_env:
    cors_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
else:
    cors_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://topstep-mvp-bot.vercel.app",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────
app.include_router(auth_routes.router, prefix="/auth", tags=["auth"])
app.include_router(integrations_routes.router, tags=["integrations"])
app.include_router(scheduler.router, prefix="/scheduler", tags=["scheduler"])
app.include_router(contracts.router, tags=["contracts"])
app.include_router(analysis_routes.router, prefix="/analysis", tags=["analysis"])
app.include_router(trading_router, prefix="/trading", tags=["trading"])
