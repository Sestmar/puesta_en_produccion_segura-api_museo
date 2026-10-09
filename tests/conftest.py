import os

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SECRET_KEY", "unit-test-secret-key-at-least-32-bytes-long!")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_museo.db")
os.environ.setdefault("LOGIN_RATE_LIMIT", "1000 per minute")
os.environ.setdefault("BCRYPT_ROUNDS", "4")

import pytest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


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
def viewer_headers(client, admin_headers):
    r = client.post(
        "/auth/register",
        json={"username": "viewer", "password": "ViewerPass123"},
        headers=admin_headers,
    )
    assert r.status_code == 201, r.text
    token = login(client, "viewer", "ViewerPass123").json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
