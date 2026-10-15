from sqlalchemy import select

from app.models import AuditLog
from tests.conftest import login


def test_list_users_requires_admin(client, admin_headers, client_headers):
    assert client.get("/users").status_code == 401
    assert client.get("/users", headers=client_headers).status_code == 403
    r = client.get("/users", headers=admin_headers)
    assert r.status_code == 200
    data = r.json()
    usernames = {user["username"] for user in data["items"]}
    assert {"admin", "client"} <= usernames
    assert all("is_active" in user for user in data["items"])


def test_update_role_takes_effect_immediately(client, admin_headers, client_headers):
    client_user = client.get("/auth/me", headers=client_headers).json()
    r = client.patch(
        f"/users/{client_user['id']}", json={"role": "admin"}, headers=admin_headers
    )
    assert r.status_code == 200
    assert r.json()["role"] == "admin"
    promoted = client.post(
        "/artists", json={"name": "Promoted Artist"}, headers=client_headers
    )
    assert promoted.status_code == 201


def test_deactivate_user_revokes_sessions_and_blocks_login(
    client, admin_headers, client_headers
):
    client_user = client.get("/auth/me", headers=client_headers).json()
    r = client.patch(
        f"/users/{client_user['id']}", json={"is_active": False}, headers=admin_headers
    )
    assert r.status_code == 200
    assert r.json()["is_active"] is False
    assert client.get("/auth/me", headers=client_headers).status_code == 401
    blocked = login(client, "client", "ClientPass123")
    assert blocked.status_code == 401
    assert blocked.json()["detail"] == "Incorrect username or password"


def test_reactivate_user_restores_login(client, admin_headers, client_headers):
    client_user = client.get("/auth/me", headers=client_headers).json()
    client.patch(
        f"/users/{client_user['id']}", json={"is_active": False}, headers=admin_headers
    )
    r = client.patch(
        f"/users/{client_user['id']}", json={"is_active": True}, headers=admin_headers
    )
    assert r.status_code == 200
    assert r.json()["is_active"] is True
    assert login(client, "client", "ClientPass123").status_code == 200


def test_cannot_modify_own_account(client, admin_headers):
    admin = client.get("/auth/me", headers=admin_headers).json()
    r = client.patch(
        f"/users/{admin['id']}", json={"is_active": False}, headers=admin_headers
    )
    assert r.status_code == 400


def test_update_unknown_user_returns_404(client, admin_headers):
    r = client.patch("/users/9999", json={"role": "admin"}, headers=admin_headers)
    assert r.status_code == 404


def test_invalid_role_rejected(client, admin_headers, client_headers):
    client_user = client.get("/auth/me", headers=client_headers).json()
    r = client.patch(
        f"/users/{client_user['id']}", json={"role": "root"}, headers=admin_headers
    )
    assert r.status_code == 422


def test_user_changes_are_audited(client, admin_headers, client_headers, db):
    client_user = client.get("/auth/me", headers=client_headers).json()
    client.patch(
        f"/users/{client_user['id']}", json={"role": "admin"}, headers=admin_headers
    )
    client.patch(
        f"/users/{client_user['id']}", json={"is_active": False}, headers=admin_headers
    )
    actions = set(db.scalars(select(AuditLog.action)).all())
    assert "admin.user.role_changed" in actions
    assert "admin.user.deactivated" in actions
