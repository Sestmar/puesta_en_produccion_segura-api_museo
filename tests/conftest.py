import os

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SECRET_KEY", "unit-test-secret-key-at-least-32-bytes-long!")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_museo.db")
os.environ.setdefault("LOGIN_RATE_LIMIT", "1000 per minute")
os.environ.setdefault("DEFAULT_RATE_LIMIT", "100000 per minute")
os.environ.setdefault("BCRYPT_ROUNDS", "4")

import pytest
from fastapi.testclient import TestClient

from app import models  # noqa: F401  (registers tables in Base.metadata)
from app.database import Base, SessionLocal, engine


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    from app.ratelimit import limiter

    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture(autouse=True)
def disable_audit_anchor():
    from app.config import settings

    previous = settings.audit_anchor_path
    settings.audit_anchor_path = None
    yield
    settings.audit_anchor_path = previous


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client():
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


def login(client, username, password):
    return client.post("/auth/login", data={"username": username, "password": password})


def refresh_cookie(response):
    """Return the raw refresh token from the httpOnly login/refresh cookie."""
    return response.cookies.get("refresh_token")


@pytest.fixture()
def admin_headers(client):
    r = client.post(
        "/auth/register",
        json={"username": "admin", "password": "AdminPass123"},
    )
    assert r.status_code == 201, r.text
    token = login(client, "admin", "AdminPass123").json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def client_headers(client, admin_headers):
    r = client.post(
        "/auth/register",
        json={"username": "client", "password": "ClientPass123"},
        headers=admin_headers,
    )
    assert r.status_code == 201, r.text
    token = login(client, "client", "ClientPass123").json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def manager_headers(client, admin_headers):
    r = client.post(
        "/auth/register",
        json={"username": "manager", "password": "ManagerPass123", "role": "manager"},
        headers=admin_headers,
    )
    assert r.status_code == 201, r.text
    token = login(client, "manager", "ManagerPass123").json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
