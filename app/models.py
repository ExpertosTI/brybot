from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from .database import Base
from pydantic import BaseModel

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # User configurable trading rules
    buy_threshold = Column(Integer, default=30)
    sell_threshold = Column(Integer, default=70)

class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class TradingRuleUpdate(BaseModel):
    buy_threshold: int
    sell_threshold: int
