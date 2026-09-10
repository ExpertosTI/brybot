import os
import secrets

from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
import pytest

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("SECRET_KEY", secrets.token_hex(32))
os.environ.setdefault("CREDENTIALS_ENCRYPTION_KEY", Fernet.generate_key().decode("utf-8"))


from app import database  # noqa: E402
from app.main import app  # noqa: E402


client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db():
    database.Base.metadata.drop_all(bind=database.engine)
    database.Base.metadata.create_all(bind=database.engine)
    yield


def register_user(username: str, email: str, password: str):
    return client.post(
        "/auth/register",
        json={"username": username, "email": email, "password": password},
    )


def login_user(username: str, password: str) -> str:
    body = {
        "username": username,
        "password": password,
        "grant_type": "password",
    }
    response = client.post("/auth/token", data=body)
    assert response.status_code == 200
    return response.json()["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_register_user_and_reject_duplicates():
    response = register_user("alice", "alice@example.com", "StrongPass1")
    assert response.status_code == 201
    payload = response.json()
    assert payload["username"] == "alice"
    assert payload["email"] == "alice@example.com"
    assert "hashed_password" not in payload

    demo_listing = client.get("/integrations", headers=auth_headers(login_user("alice", "StrongPass1")))
    assert demo_listing.status_code == 200
    assert len(demo_listing.json()) == 1
    assert demo_listing.json()[0]["provider"] == "DEMO"

    duplicate_username = register_user("alice", "other@example.com", "StrongPass1")
    assert duplicate_username.status_code == 400

    duplicate_email = register_user("other", "alice@example.com", "StrongPass1")
    assert duplicate_email.status_code == 400


def test_integrations_crud_and_isolation():
    register_user("alice", "alice@example.com", "StrongPass1")
    register_user("bob", "bob@example.com", "StrongPass1")

    token_alice = login_user("alice", "StrongPass1")
    token_bob = login_user("bob", "StrongPass1")

    create_payload = {
        "display_name": "TopStepX - Main",
        "provider": "TOPSTEPX",
        "metadata": {"environment": "sandbox", "accountId": "A-123"},
        "credentials": {"apiKey": "key", "apiSecret": "secret"},
    }
    created = client.post(
        "/integrations",
        json=create_payload,
        headers=auth_headers(token_alice),
    )
    assert created.status_code == 201
    data = created.json()
    assert data["display_name"] == "TopStepX - Main"
    assert data["has_credentials"] is True
    assert "credentials" not in data

    listing = client.get("/integrations", headers=auth_headers(token_alice))
    assert listing.status_code == 200
    assert len(listing.json()) == 2

    integration_id = data["id"]
    updated = client.put(
        f"/integrations/{integration_id}",
        json={"display_name": "TopStepX - Updated", "status": "disabled"},
        headers=auth_headers(token_alice),
    )
    assert updated.status_code == 200
    assert updated.json()["display_name"] == "TopStepX - Updated"
    assert updated.json()["status"] == "disabled"

    forbidden = client.get(
        f"/integrations/{integration_id}",
        headers=auth_headers(token_bob),
    )
    assert forbidden.status_code == 404

    deleted = client.delete(
        f"/integrations/{integration_id}",
        headers=auth_headers(token_alice),
    )
    assert deleted.status_code == 204

    listing_after = client.get("/integrations", headers=auth_headers(token_alice))
    assert listing_after.status_code == 200
    assert len(listing_after.json()) == 1
    assert listing_after.json()[0]["provider"] == "DEMO"


def test_demo_login():
    response = client.post("/auth/demo-login")
    assert response.status_code == 200
    payload = response.json()
    assert payload["username"] == "demo"
    assert payload["mode"] == "demo"
    assert "access_token" in payload

    # Test accessing protected route with demo token
    me_resp = client.get("/auth/me", headers=auth_headers(payload["access_token"]))
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "demo"

    second_response = client.post("/auth/demo-login")
    assert second_response.status_code == 200
    assert second_response.json()["integration_id"] == payload["integration_id"]


def test_topstep_direct_login():
    payload = {
        "username": "trader_topstep",
        "api_key": "sec_topstep_key_123",
        "account_id": "TS-9988",
    }
    response = client.post("/auth/topstep-direct-login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "trader_topstep" in data["username"]
