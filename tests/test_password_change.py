from sqlalchemy import select

from app.models import AuditLog
from tests.conftest import login, refresh_cookie


def _change(client, headers, current, new):
    return client.put(
        "/auth/password",
        json={"current_password": current, "new_password": new},
        headers=headers,
    )


def test_change_password_requires_authentication(client):
    r = client.put(
        "/auth/password",
        json={"current_password": "x", "new_password": "NewPass123"},
    )
    assert r.status_code == 401


def test_change_password_rejects_wrong_current(client, admin_headers):
    r = _change(client, admin_headers, "WrongPass1", "NewPass123")
    assert r.status_code == 400
    assert login(client, "admin", "AdminPass123").status_code == 200


def test_change_password_rejects_weak_new_password(client, admin_headers):
    r = _change(client, admin_headers, "AdminPass123", "weak")
    assert r.status_code == 422


def test_change_password_rejects_same_password(client, admin_headers):
    r = _change(client, admin_headers, "AdminPass123", "AdminPass123")
    assert r.status_code == 400


def test_change_password_success_allows_new_credentials(client, admin_headers):
    r = _change(client, admin_headers, "AdminPass123", "NewAdmin123")
    assert r.status_code == 204
    assert login(client, "admin", "NewAdmin123").status_code == 200
    assert login(client, "admin", "AdminPass123").status_code == 401


def test_change_password_revokes_the_current_session(client, admin_headers):
    r = _change(client, admin_headers, "AdminPass123", "NewAdmin123")
    assert r.status_code == 204
    assert client.get("/auth/me", headers=admin_headers).status_code == 401


def test_change_password_revokes_refresh_tokens(client, admin_headers):
    r = login(client, "admin", "AdminPass123")
    cookie = refresh_cookie(r)
    _change(client, admin_headers, "AdminPass123", "NewAdmin123")
    r = client.post("/auth/refresh", cookies={"refresh_token": cookie})
    assert r.status_code == 401


def test_change_password_is_audited(client, admin_headers, db):
    _change(client, admin_headers, "AdminPass123", "NewAdmin123")
    rows = db.scalars(
        select(AuditLog).where(AuditLog.action == "auth.password.changed")
    ).all()
    assert len(rows) == 1
    assert rows[0].actor == "admin"
    assert "NewAdmin123" not in str(rows[0].details)
