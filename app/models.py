from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text, Index
from datetime import datetime
from .database import Base
from pydantic import BaseModel
from typing import Any, Optional
from enum import Enum

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


class IntegrationProvider(str, Enum):
    TOPSTEPX = "TOPSTEPX"
    TRADOVATE = "TRADOVATE"
    NINJATRADER = "NINJATRADER"
    TRADINGVIEW = "TRADINGVIEW"
    IBKR = "IBKR"
    OTHER = "OTHER"


class PlatformIntegration(Base):
    __tablename__ = "platform_integrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    display_name = Column(String, nullable=False)
    provider = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="active")
    metadata = Column(JSON, nullable=True)
    credentials_encrypted = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ix_platform_integrations_user_provider", "user_id", "provider"),
    )


class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserPublic(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    class Config:
        orm_mode = True


class TradingRuleUpdate(BaseModel):
    buy_threshold: int
    sell_threshold: int


class IntegrationBase(BaseModel):
    display_name: str
    provider: IntegrationProvider
    metadata: Optional[dict[str, Any]] = None
    status: Optional[str] = "active"


class IntegrationCreate(IntegrationBase):
    credentials: Optional[dict[str, Any]] = None


class IntegrationUpdate(BaseModel):
    display_name: Optional[str] = None
    status: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
    credentials: Optional[dict[str, Any]] = None


class IntegrationOut(BaseModel):
    id: int
    display_name: str
    provider: IntegrationProvider
    status: str
    metadata: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    has_credentials: bool

    class Config:
        orm_mode = True
