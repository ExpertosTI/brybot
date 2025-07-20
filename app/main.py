from fastapi import FastAPI
from . import auth_routes, models, database, scheduler
from .database import engine
from fastapi.middleware.cors import CORSMiddleware

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(auth_routes.router, prefix="/auth", tags=["auth"])
app.include_router(scheduler.router, prefix="/scheduler", tags=["scheduler"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
                    "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
