from fastapi import FastAPI
from . import auth_routes, models, database
from .database import engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(auth_routes.router)

