import pytest

from tests.conftest import login


def test_first_user_becomes_admin(client):
    r = client.post(
        "/auth/register", json={"username": "admin", "password": "AdminPass123"}
    )
    assert r.status_code == 201
    body = r.json()
    assert body["username"] == "admin"
    assert body["role"] == "admin"
    assert "password" not in body
    assert "hashed_password" not in body


def test_second_register_requires_authentication(client, admin_headers):
    r = client.post(
        "/auth/register", json={"username": "mallory", "password": "Hacker1234"}
    )
    assert r.status_code == 401


def test_viewer_cannot_register_users(client, viewer_headers):
    r = client.post(
        "/auth/register",
        json={"username": "mallory", "password": "Hacker1234"},
        headers=viewer_headers,
    )
    assert r.status_code == 403


def test_admin_can_register_viewer(client, admin_headers):
    r = client.post(
        "/auth/register",
        json={"username": "viewer2", "password": "Viewer2Pass", "role": "viewer"},
        headers=admin_headers,
    )
    assert r.status_code == 201
    assert r.json()["role"] == "viewer"


def test_register_duplicate_username_returns_conflict(client, admin_headers):
    client.post(
        "/auth/register",
        json={"username": "carol", "password": "CarolPass1"},
        headers=admin_headers,
    )
    r = client.post(
        "/auth/register",
        json={"username": "carol", "password": "CarolPass2"},
        headers=admin_headers,
    )
    assert r.status_code == 409


def test_register_weak_password_rejected(client):
    r = client.post(
        "/auth/register", json={"username": "dave", "password": "short"}
    )
    assert r.status_code == 422


def test_register_password_without_digit_rejected(client):
    r = client.post(
        "/auth/register", json={"username": "dave", "password": "OnlyLetters"}
    )
    assert r.status_code == 422


def test_register_invalid_username_rejected(client):
    r = client.post(
        "/auth/register", json={"username": "a b", "password": "Valid1234"}
    )
    assert r.status_code == 422


def test_login_success_returns_bearer_token(client, admin_headers):
    r = login(client, "admin", "AdminPass123")
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "bearer"
    assert len(body["access_token"]) > 0


def test_login_wrong_password_returns_generic_401(client, admin_headers):
    r = login(client, "admin", "WrongPassword1")
    assert r.status_code == 401
    assert r.json()["detail"] == "Incorrect username or password"


def test_login_nonexistent_user_returns_same_generic_401(client, admin_headers):
    r = login(client, "nobody", "Whatever123")
    assert r.status_code == 401
    assert r.json()["detail"] == "Incorrect username or password"


def test_login_rate_limit_returns_429(client, admin_headers, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "login_rate_limit", "3 per minute")
    for _ in range(3):
        assert login(client, "admin", "WrongPassword1").status_code == 401
    r = login(client, "admin", "WrongPassword1")
    assert r.status_code == 429


def test_refresh_rate_limit_returns_429(client, admin_headers, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "refresh_rate_limit", "3 per minute")
    token = login(client, "admin", "AdminPass123").json()["refresh_token"]
    for _ in range(3):
        r = client.post("/auth/refresh", json={"refresh_token": token})
        assert r.status_code == 200, r.text
        token = r.json()["refresh_token"]
    r = client.post("/auth/refresh", json={"refresh_token": token})
    assert r.status_code == 429


def test_me_requires_token(client):
    r = client.get("/auth/me")
    assert r.status_code == 401
    assert r.headers.get("www-authenticate") == "Bearer"


def test_me_returns_current_user(client, admin_headers):
    r = client.get("/auth/me", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == "admin"
    assert body["role"] == "admin"


def test_me_with_invalid_token_returns_401(client):
    r = client.get(
        "/auth/me", headers={"Authorization": "Bearer not.a.valid.token"}
    )
    assert r.status_code == 401


def test_me_with_token_of_deleted_user_returns_401(client, admin_headers, db):
    from sqlalchemy import delete

    from app.models import User

    r = login(client, "admin", "AdminPass123")
    token = r.json()["access_token"]
    db.execute(delete(User).where(User.username == "admin"))
    db.commit()
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401
