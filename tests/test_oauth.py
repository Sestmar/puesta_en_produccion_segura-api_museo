import time

import pytest
import sqlalchemy as sa
from alembic.config import Config
from sqlalchemy import select

from alembic import command
from app import oauth
from app.config import settings
from app.models import AuditLog, User
from tests.conftest import login, refresh_cookie

GOOGLE_CALLBACK = "/auth/google/callback"


@pytest.fixture()
def google_settings(monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "client-id.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "google_client_secret", "client-secret")
    monkeypatch.setattr(settings, "google_redirect_uri", "http://testserver/auth/google/callback")
    monkeypatch.setattr(settings, "frontend_url", "http://frontend.test")
    return settings


def fake_google(monkeypatch, *, sub="google-sub-1", email="ada@example.com"):
    monkeypatch.setattr("app.routers.oauth.exchange_code", lambda code: "access-token")
    monkeypatch.setattr(
        "app.routers.oauth.fetch_userinfo",
        lambda token: {"sub": sub, "email": email},
    )


def callback(client, *, state=None, code="auth-code", **params):
    query = {"code": code, "state": state or oauth.create_state(), **params}
    return client.get(GOOGLE_CALLBACK, params=query, follow_redirects=False)


def test_login_unavailable_when_not_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", None)
    monkeypatch.setattr(settings, "google_client_secret", None)
    r = client.get("/auth/google/login", follow_redirects=False)
    assert r.status_code == 503
    assert r.json()["detail"] == "Google sign-in is not configured"


def test_callback_unavailable_when_not_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", None)
    monkeypatch.setattr(settings, "google_client_secret", None)
    r = callback(client)
    assert r.status_code == 503


def test_login_redirects_to_google_with_state(client, google_settings):
    r = client.get("/auth/google/login", follow_redirects=False)
    assert r.status_code == 307
    location = r.headers["location"]
    assert location.startswith(oauth.AUTHORIZATION_ENDPOINT)
    assert "client_id=client-id.apps.googleusercontent.com" in location
    assert "response_type=code" in location
    assert "scope=openid+email+profile" in location
    assert "state=" in location


def test_state_is_signed_and_rejects_tampering():
    state = oauth.create_state()
    assert oauth.verify_state(state)
    nonce, issued, signature = state.split(".")
    flipped = ("0" if signature[0] != "0" else "1") + signature[1:]
    assert not oauth.verify_state(f"{nonce}.{issued}.{flipped}")
    assert not oauth.verify_state("not-a-state")
    assert not oauth.verify_state(f"{nonce}.{issued}")


def test_state_expires():
    payload = f"nonce.{int(time.time()) - oauth.STATE_MAX_AGE_SECONDS - 1}"
    assert not oauth.verify_state(f"{payload}.{oauth._sign(payload)}")


def test_callback_rejects_invalid_state(client, google_settings, monkeypatch):
    fake_google(monkeypatch)
    r = callback(client, state="forged.state.signature")
    assert r.status_code == 400


def test_callback_redirects_on_google_error(client, google_settings, monkeypatch):
    fake_google(monkeypatch)
    r = callback(client, error="access_denied")
    assert r.status_code == 303
    assert r.headers["location"] == "http://frontend.test/login?oauth=error"


def test_callback_creates_first_user_as_admin(client, google_settings, monkeypatch, db):
    fake_google(monkeypatch)
    r = callback(client)
    assert r.status_code == 303
    assert r.headers["location"] == "http://frontend.test/login?oauth=success"
    assert refresh_cookie(r)

    user = db.scalar(select(User).where(User.email == "ada@example.com"))
    assert user.username == "ada"
    assert user.role == "admin"
    assert user.hashed_password is None
    assert user.oauth_provider == "google"
    assert user.oauth_subject == "google-sub-1"

    rows = db.scalars(select(AuditLog).where(AuditLog.action == "auth.oauth.signup")).all()
    assert len(rows) == 1
    assert rows[0].actor == "ada"


def test_callback_refresh_cookie_opens_a_session(client, google_settings, monkeypatch):
    fake_google(monkeypatch)
    cookie = refresh_cookie(callback(client))

    refreshed = client.post("/auth/refresh", cookies={"refresh_token": cookie})
    assert refreshed.status_code == 200
    token = refreshed.json()["access_token"]
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["username"] == "ada"


def test_callback_reuses_existing_identity(client, google_settings, monkeypatch, db):
    fake_google(monkeypatch)
    assert callback(client).status_code == 303
    assert callback(client).status_code == 303

    users = db.scalars(select(User).where(User.email == "ada@example.com")).all()
    assert len(users) == 1
    rows = db.scalars(select(AuditLog).where(AuditLog.action == "auth.oauth.login")).all()
    assert len(rows) == 1


def test_callback_creates_client_when_users_exist(
    client, google_settings, monkeypatch, admin_headers, db
):
    fake_google(monkeypatch, sub="google-sub-2", email="grace@example.com")
    assert callback(client).status_code == 303
    user = db.scalar(select(User).where(User.email == "grace@example.com"))
    assert user.role == "client"


def test_callback_handles_username_collision(
    client, google_settings, monkeypatch, admin_headers, db
):
    assert (
        client.post(
            "/auth/register",
            json={"username": "ada", "password": "AdaPassword123"},
            headers=admin_headers,
        ).status_code
        == 201
    )
    fake_google(monkeypatch)
    assert callback(client).status_code == 303
    user = db.scalar(select(User).where(User.email == "ada@example.com"))
    assert user.username == "ada-2"


def test_callback_blocks_inactive_user(client, google_settings, monkeypatch, db):
    fake_google(monkeypatch)
    assert callback(client).status_code == 303
    user = db.scalar(select(User).where(User.email == "ada@example.com"))
    user.is_active = False
    db.commit()

    r = callback(client)
    assert r.status_code == 303
    assert r.headers["location"] == "http://frontend.test/login?oauth=error"
    rows = db.scalars(select(AuditLog).where(AuditLog.action == "auth.login.blocked")).all()
    assert len(rows) == 1


def test_callback_redirects_when_google_rejects_exchange(
    client, google_settings, monkeypatch
):
    def boom(code):
        raise oauth.OAuthError("rejected")

    monkeypatch.setattr("app.routers.oauth.exchange_code", boom)
    r = callback(client)
    assert r.status_code == 303
    assert r.headers["location"] == "http://frontend.test/login?oauth=error"


def test_oauth_user_cannot_use_password_login(client, google_settings, monkeypatch):
    fake_google(monkeypatch)
    assert callback(client).status_code == 303
    r = login(client, "ada", "SomePassword123")
    assert r.status_code == 401


def test_oauth_user_cannot_change_password(client, google_settings, monkeypatch):
    fake_google(monkeypatch)
    cookie = refresh_cookie(callback(client))
    token = client.post("/auth/refresh", cookies={"refresh_token": cookie}).json()[
        "access_token"
    ]
    r = client.put(
        "/auth/password",
        json={"current_password": "whatever", "new_password": "NewPassword123"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400
    assert "Google" in r.json()["detail"]


def test_find_or_create_user_is_idempotent(db):
    first, created = oauth.find_or_create_user(
        db, subject="sub-x", email="ada@example.com"
    )
    assert created is True
    second, created_again = oauth.find_or_create_user(
        db, subject="sub-x", email="other@example.com"
    )
    assert created_again is False
    assert second.id == first.id


def test_oauth_migration_upgrades_and_downgrades(tmp_path, monkeypatch):
    url = f"sqlite:///{(tmp_path / 'migration.db').as_posix()}"
    monkeypatch.setattr(settings, "database_url", url)
    cfg = Config()
    cfg.set_main_option("script_location", "alembic")

    command.upgrade(cfg, "head")
    engine = sa.create_engine(url)
    columns = {c["name"]: c for c in sa.inspect(engine).get_columns("users")}
    assert {"email", "oauth_provider", "oauth_subject"} <= set(columns)
    assert columns["hashed_password"]["nullable"] is True

    command.downgrade(cfg, "d5a7b9c1e3f2")
    columns = {c["name"]: c for c in sa.inspect(engine).get_columns("users")}
    assert "oauth_provider" not in columns
    assert columns["hashed_password"]["nullable"] is False
    engine.dispose()
