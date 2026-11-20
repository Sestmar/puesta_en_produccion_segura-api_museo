from datetime import UTC, datetime

from sqlalchemy import select, update

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
    user.locked_until = datetime(2020, 1, 1, tzinfo=UTC)
    db.commit()
    r = login(client, "admin", "AdminPass123")
    assert r.status_code == 200
    db.refresh(user)
    assert user.failed_login_attempts == 0
    assert user.locked_until is None


def test_concurrent_failures_are_not_lost(client, db, monkeypatch):
    """Failures committed by concurrent requests count towards the lockout.

    Simulates the race: while this request checks the password (bcrypt), other
    requests for the same account commit their own failures. With a Python-side
    read-modify-write those increments were overwritten (lost update) and the
    account never locked.
    """
    from app.database import SessionLocal
    from app.routers import auth as auth_router

    _register_admin(client)
    real_verify = auth_router.verify_password

    def verify_with_concurrent_failures(plain, hashed):
        with SessionLocal() as other:
            other.execute(
                update(User)
                .where(User.username == "admin")
                .values(
                    failed_login_attempts=User.failed_login_attempts
                    + settings.max_failed_attempts
                    - 1
                )
            )
            other.commit()
        return real_verify(plain, hashed)

    monkeypatch.setattr(auth_router, "verify_password", verify_with_concurrent_failures)
    r = login(client, "admin", "WrongPassword1")
    assert r.status_code == 401
    monkeypatch.setattr(auth_router, "verify_password", real_verify)

    user = db.scalar(select(User).where(User.username == "admin"))
    assert user.failed_login_attempts == settings.max_failed_attempts
    assert user.locked_until is not None
    assert login(client, "admin", "AdminPass123").status_code == 401
