import pytest
from sqlalchemy import select

from app.config import settings
from app.models import AuditLog, User
from app.security import verify_password
from tests.conftest import login


def signup(client, username="newbie", password="NewbiePass1", **extra):
    return client.post(
        "/auth/signup", json={"username": username, "password": password, **extra}
    )


def test_signup_creates_client_without_authentication(client, admin_headers):
    r = signup(client)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["username"] == "newbie"
    assert body["role"] == "client"
    assert body["is_active"] is True
    assert "password" not in body and "hashed_password" not in body


def test_signed_up_user_can_login_and_read_profile(client, admin_headers):
    signup(client)
    r = login(client, "newbie", "NewbiePass1")
    assert r.status_code == 200
    token = r.json()["access_token"]
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["role"] == "client"


def test_signup_stores_bcrypt_hash_not_plaintext(client, admin_headers, db):
    signup(client)
    user = db.scalar(select(User).where(User.username == "newbie"))
    assert user.hashed_password != "NewbiePass1"
    assert user.hashed_password.startswith("$2")
    assert verify_password("NewbiePass1", user.hashed_password)


@pytest.mark.parametrize("role", ["admin", "manager", "client"])
def test_signup_rejects_role_field(client, admin_headers, role):
    r = signup(client, role=role)
    assert r.status_code == 422


def test_signup_rejects_unknown_fields(client, admin_headers):
    r = signup(client, is_active=False)
    assert r.status_code == 422


def test_signed_up_client_cannot_write_catalog(client, admin_headers):
    signup(client)
    token = login(client, "newbie", "NewbiePass1").json()["access_token"]
    r = client.post(
        "/artists",
        json={"name": "Intruso"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403


def test_signup_duplicate_username_returns_conflict(client, admin_headers):
    assert signup(client).status_code == 201
    r = signup(client, password="OtherPass123")
    assert r.status_code == 409
    assert r.json()["detail"] == "Username is already taken"


def test_signup_cannot_take_existing_admin_username(client, admin_headers):
    assert signup(client, username="admin").status_code == 409


@pytest.mark.parametrize(
    ("username", "password"),
    [
        ("ab", "ValidPass123"),
        ("bad name!", "ValidPass123"),
        ("gooduser", "short1"),
        ("gooduser", "onlyletters"),
        ("gooduser", "123456789"),
    ],
)
def test_signup_validates_credentials(client, admin_headers, username, password):
    assert signup(client, username=username, password=password).status_code == 422


def test_signup_unavailable_before_admin_bootstrap(client):
    r = signup(client)
    assert r.status_code == 503
    bootstrap = client.post(
        "/auth/register", json={"username": "admin", "password": "AdminPass123"}
    )
    assert bootstrap.status_code == 201
    assert bootstrap.json()["role"] == "admin"


def test_signup_is_audited(client, admin_headers, db):
    signup(client)
    rows = db.scalars(select(AuditLog).where(AuditLog.action == "auth.signup")).all()
    assert len(rows) == 1
    assert rows[0].actor == "newbie"
    assert rows[0].resource_type == "user"
    assert "NewbiePass1" not in str(rows[0].details)


def test_signup_rate_limit_returns_429(client, admin_headers, monkeypatch):
    monkeypatch.setattr(settings, "signup_rate_limit", "2 per minute")
    assert signup(client, username="first").status_code == 201
    assert signup(client, username="second").status_code == 201
    assert signup(client, username="third").status_code == 429
