from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import os
from datetime import datetime, timedelta
from . import models, database
from .security import hash_password, verify_password
from .auth import get_session_token
import re

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set. This is required for JWT operations.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def ensure_demo_integration(db: Session, user: models.User) -> models.PlatformIntegration:
    demo = (
        db.query(models.PlatformIntegration)
        .filter(models.PlatformIntegration.user_id == user.id)
        .filter(models.PlatformIntegration.provider == models.IntegrationProvider.DEMO.value)
        .first()
    )
    if not demo:
        demo = models.PlatformIntegration(
            user_id=user.id,
            display_name="Demo Account",
            provider=models.IntegrationProvider.DEMO.value,
            status="active",
            integration_metadata={
                "accountId": f"DEMO-{user.id:06d}",
                "startingBalance": 100000,
                "mode": "demo",
            },
            credentials_encrypted="demo",
        )
        db.add(demo)
        db.flush()
    if not user.active_integration_id:
        user.active_integration_id = demo.id
    db.commit()
    db.refresh(demo)
    return demo


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/register", response_model=models.UserPublic, status_code=status.HTTP_201_CREATED)
def register(user: models.UserCreate, db: Session = Depends(database.get_db)):
    if get_user_by_username(db, user.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    existing_email = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(user.password) < 10:
        raise HTTPException(status_code=400, detail="Password must be at least 10 characters long.")
    if not re.search(r"[A-Z]", user.password):
        raise HTTPException(status_code=400, detail="Password must include an uppercase letter.")
    if not re.search(r"[a-z]", user.password):
        raise HTTPException(status_code=400, detail="Password must include a lowercase letter.")
    if not re.search(r"\d", user.password):
        raise HTTPException(status_code=400, detail="Password must include a digit.")
    try:
        hashed = hash_password(user.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    new_user = models.User(username=user.username, email=user.email, hashed_password=hashed)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    ensure_demo_integration(db, new_user)
    return models.UserPublic.model_validate(new_user)

@router.post("/token")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = authenticate_user(db, form.username, form.password)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": token, "token_type": "bearer"}

import secrets
from typing import Optional
from pydantic import BaseModel


class TopStepDirectLoginRequest(BaseModel):
    username: str
    api_key: str
    account_id: Optional[str] = None
    display_name: Optional[str] = "TopStepX Live"


@router.post("/demo-login")
def demo_login(db: Session = Depends(database.get_db)):
    """Authenticate or auto-provision the simulated demo account."""
    demo_user = get_user_by_username(db, "demo")
    if not demo_user:
        random_pw = secrets.token_urlsafe(16) + "A1a!"
        demo_user = models.User(
            username="demo",
            email="demo@trade.adderlymarte.com",
            hashed_password=hash_password(random_pw),
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

    # Ensure demo integration exists
    demo_integration = (
        db.query(models.PlatformIntegration)
        .filter(
            models.PlatformIntegration.user_id == demo_user.id,
            models.PlatformIntegration.provider == models.IntegrationProvider.DEMO.value,
        )
        .first()
    )
    if not demo_integration:
        demo_integration = models.PlatformIntegration(
            user_id=demo_user.id,
            display_name="TopStepX Demo (Simulado)",
            provider=models.IntegrationProvider.DEMO.value,
            status="active",
            integration_metadata={"accountId": f"DEMO-{demo_user.id:06d}", "startingBalance": 100000, "mode": "demo"},
            credentials_encrypted="demo",
        )
        db.add(demo_integration)
        db.commit()
        db.refresh(demo_integration)

    demo_user.active_integration_id = demo_integration.id
    db.commit()

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES * 4)
    token = create_access_token(
        data={"sub": demo_user.username, "mode": "demo"},
        expires_delta=access_token_expires,
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": "demo",
        "mode": "demo",
        "integration_id": demo_integration.id,
    }


@router.post("/topstep-direct-login")
def topstep_direct_login(
    payload: TopStepDirectLoginRequest,
    db: Session = Depends(database.get_db),
):
    """Authenticate directly with TopStep credentials."""
    if not payload.username or not payload.api_key:
        raise HTTPException(status_code=400, detail="Username and API Key are required.")

    user_handle = f"topstep_{payload.username.lower().replace('@', '_').replace('.', '_')}"
    user = get_user_by_username(db, user_handle)
    if not user:
        random_pw = secrets.token_urlsafe(16) + "A1a!"
        user = models.User(
            username=user_handle,
            email=f"{user_handle}@trade.adderlymarte.com",
            hashed_password=hash_password(random_pw),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    from app.crypto import encrypt_credentials
    encrypted_creds = encrypt_credentials({
        "userName": payload.username,
        "apiKey": payload.api_key,
    })

    integration = (
        db.query(models.PlatformIntegration)
        .filter(
            models.PlatformIntegration.user_id == user.id,
            models.PlatformIntegration.provider == models.IntegrationProvider.TOPSTEPX.value,
        )
        .first()
    )
    if not integration:
        integration = models.PlatformIntegration(
            user_id=user.id,
            display_name=payload.display_name or "TopStepX Live",
            provider=models.IntegrationProvider.TOPSTEPX.value,
            status="active",
            integration_metadata={"accountId": payload.account_id or payload.username, "mode": "live"},
            credentials_encrypted=encrypted_creds,
        )
        db.add(integration)
    else:
        integration.credentials_encrypted = encrypted_creds
        integration.status = "active"
        if payload.account_id:
            meta = integration.integration_metadata or {}
            meta["accountId"] = payload.account_id
            integration.integration_metadata = meta

    db.commit()
    db.refresh(integration)

    user.active_integration_id = integration.id
    db.commit()

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": user.username, "mode": "live"},
        expires_delta=access_token_expires,
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user.username,
        "integration_id": integration.id,
    }


@router.get("/me")
def read_users_me(token: str = Depends(oauth2_scheme)):
    username = decode_jwt_token(token)
    return {"username": username}


# Dependency to get current user

def decode_jwt_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token: username not found")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
def get_current_user(token: str = Depends(oauth2_scheme)):
    return decode_jwt_token(token)


def get_current_user_model(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(database.get_db),
):
    username = decode_jwt_token(token)
    user = get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    ensure_demo_integration(db, user)
    return user

@router.get("/topstep-token")
def topstep_login(current_user: str = Depends(get_current_user)):
    return {"token": get_session_token()}


@router.get("/rules")
def get_rules(
    current_user: str = Depends(get_current_user),
    db: Session = Depends(database.get_db),
):
    user = get_user_by_username(db, current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "buy_threshold": user.buy_threshold or 30,
        "sell_threshold": user.sell_threshold or 70,

    }


@router.put("/rules")
def update_rules(
    rules: models.TradingRuleUpdate,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(database.get_db),
):
    user = get_user_by_username(db, current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.buy_threshold = rules.buy_threshold
    user.sell_threshold = rules.sell_threshold
    db.commit()
    db.refresh(user)
    return {"status": "updated"}
