from sqlalchemy import select

from app.config import settings
from app.models import AuditLog
from tests.conftest import login


def _audit_rows(db, action=None):
    query = select(AuditLog).order_by(AuditLog.id)
    if action is not None:
        query = query.where(AuditLog.action == action)
    return db.scalars(query).all()


def _register_admin(client):
    r = client.post(
        "/auth/register",
        json={"username": "admin", "password": "AdminPass123"},
    )
    assert r.status_code == 201, r.text


def test_register_is_audited(client, db):
    _register_admin(client)
    rows = _audit_rows(db, "auth.register")
    assert len(rows) == 1
    assert rows[0].actor == "admin"
    assert rows[0].resource_type == "user"
    assert rows[0].request_id is not None


def test_login_success_is_audited(client, db, admin_headers):
    rows = _audit_rows(db, "auth.login.success")
    assert len(rows) == 1
    assert rows[0].actor == "admin"


def test_login_failure_is_audited_without_credentials(client, db):
    _register_admin(client)
    r = login(client, "admin", "WrongPassword1")
    assert r.status_code == 401
    rows = _audit_rows(db, "auth.login.failed")
    assert len(rows) == 1
    assert rows[0].actor == "admin"
    assert "WrongPassword1" not in str(rows[0].details)


def test_lockout_is_audited(client, db):
    _register_admin(client)
    for _ in range(settings.max_failed_attempts):
        login(client, "admin", "WrongPassword1")
    locked = _audit_rows(db, "auth.login.locked")
    assert len(locked) == 1
    assert locked[0].actor == "admin"
    assert len(_audit_rows(db, "auth.login.failed")) == settings.max_failed_attempts


def test_refresh_and_logout_are_audited(client, db):
    _register_admin(client)
    tokens = login(client, "admin", "AdminPass123").json()
    client.post(
        "/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    client.post("/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    assert len(_audit_rows(db, "auth.refresh")) == 1
    assert len(_audit_rows(db, "auth.logout")) == 1


def test_crud_writes_are_audited(client, db, admin_headers):
    r = client.post(
        "/artists", json={"name": "Frida Kahlo"}, headers=admin_headers
    )
    assert r.status_code == 201
    artist_id = r.json()["id"]
    client.put(
        f"/artists/{artist_id}", json={"name": "Frida"}, headers=admin_headers
    )
    client.delete(f"/artists/{artist_id}", headers=admin_headers)
    creates = _audit_rows(db, "write.create")
    updates = _audit_rows(db, "write.update")
    deletes = _audit_rows(db, "write.delete")
    assert len(creates) == 1 and creates[0].resource_type == "artist"
    assert len(updates) == 1 and updates[0].resource_type == "artist"
    assert len(deletes) == 1 and deletes[0].resource_type == "artist"


def test_audit_details_never_contain_credentials(client, db, admin_headers):
    rows = _audit_rows(db, "auth.login.success")
    assert rows
    text = str([row.details for row in rows])
    assert "AdminPass123" not in text
    assert "Bearer " not in text