from fastapi import FastAPI
from . import auth_routes, models, database, scheduler, contracts
from . import analysis_routes
from .database import engine
from fastapi.middleware.cors import CORSMiddleware
from .trading_routes import router as trading_router

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(auth_routes.router, prefix="/auth", tags=["auth"])
app.include_router(scheduler.router, prefix="/scheduler", tags=["scheduler"])
app.include_router(contracts.router, tags=["contracts"])
app.include_router(analysis_routes.router, prefix="/analysis", tags=["analysis"])
app.include_router(trading_router, prefix="/trading", tags=["trading"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
                    "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
