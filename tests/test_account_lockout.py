from datetime import datetime, timezone

from sqlalchemy import select

from app.config import settings
from app.models import User
from tests.conftest import login


def _register_admin(client):
    r = client.post(
        "/auth/register",
        json={"username": "admin", "password": "AdminPass123"},
    )
    assert r.status_code == 201, r.text  # bootstrap (empty DB)


def test_locks_after_max_failed_attempts(client, db):
    _register_admin(client)
    for _ in range(settings.max_failed_attempts):
        r = login(client, "admin", "WrongPassword1")
        assert r.status_code == 401
    r = login(client, "admin", "AdminPass123")
    assert r.status_code == 401
    user = db.scalar(select(User).where(User.username == "admin"))
    assert user.failed_login_attempts == settings.max_failed_attempts
    assert user.locked_until is not None


def test_locked_account_keeps_generic_error(client):
    _register_admin(client)
    for _ in range(settings.max_failed_attempts):
        login(client, "admin", "WrongPassword1")
    r = login(client, "admin", "AdminPass123")
    assert r.status_code == 401
    assert r.json()["detail"] == "Incorrect username or password"


def test_successful_login_resets_failed_attempts(client, db):
    _register_admin(client)
    for _ in range(settings.max_failed_attempts - 1):
        login(client, "admin", "WrongPassword1")
    r = login(client, "admin", "AdminPass123")
    assert r.status_code == 200
    user = db.scalar(select(User).where(User.username == "admin"))
    assert user.failed_login_attempts == 0
    assert user.locked_until is None


def test_expired_lockout_permits_login_and_resets(client, db):
    _register_admin(client)
    for _ in range(settings.max_failed_attempts):
        login(client, "admin", "WrongPassword1")
    user = db.scalar(select(User).where(User.username == "admin"))
    user.locked_until = datetime(2020, 1, 1, tzinfo=timezone.utc)
    db.commit()
    r = login(client, "admin", "AdminPass123")
    assert r.status_code == 200
    db.refresh(user)
    assert user.failed_login_attempts == 0
    assert user.locked_until is None