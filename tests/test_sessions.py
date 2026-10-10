from app.config import settings
from tests.conftest import login


def test_login_returns_token_pair(client, admin_headers):
    body = login(client, "admin", "AdminPass123").json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["refresh_token"]


def test_refresh_rotates_refresh_token(client, admin_headers):
    pair = login(client, "admin", "AdminPass123").json()

    r = client.post("/auth/refresh", json={"refresh_token": pair["refresh_token"]})
    assert r.status_code == 200
    rotated = r.json()
    assert rotated["refresh_token"] != pair["refresh_token"]
    assert rotated["access_token"]

    reuse = client.post(
        "/auth/refresh", json={"refresh_token": pair["refresh_token"]}
    )
    assert reuse.status_code == 401


def test_refresh_token_reuse_revokes_all_sessions(client, admin_headers):
    first = login(client, "admin", "AdminPass123").json()
    second = login(client, "admin", "AdminPass123").json()

    rotated = client.post(
        "/auth/refresh", json={"refresh_token": first["refresh_token"]}
    ).json()

    reuse = client.post(
        "/auth/refresh", json={"refresh_token": first["refresh_token"]}
    )
    assert reuse.status_code == 401

    assert (
        client.post(
            "/auth/refresh", json={"refresh_token": second["refresh_token"]}
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/auth/refresh", json={"refresh_token": rotated["refresh_token"]}
        ).status_code
        == 401
    )


def test_refresh_with_unknown_token_returns_401(client):
    r = client.post("/auth/refresh", json={"refresh_token": "not-a-real-token"})
    assert r.status_code == 401


def test_logout_revokes_refresh_token(client, admin_headers):
    pair = login(client, "admin", "AdminPass123").json()
    r = client.post("/auth/logout", json={"refresh_token": pair["refresh_token"]})
    assert r.status_code == 204
    assert (
        client.post(
            "/auth/refresh", json={"refresh_token": pair["refresh_token"]}
        ).status_code
        == 401
    )


def test_list_sessions_requires_auth(client):
    assert client.get("/auth/sessions").status_code == 401


def test_list_sessions_returns_only_active_sessions(client, admin_headers):
    login(client, "admin", "AdminPass123")
    r = client.get("/auth/sessions", headers=admin_headers)
    assert r.status_code == 200
    sessions = r.json()
    assert len(sessions) >= 1
    assert all(s["revoked_at"] is None for s in sessions)


def test_revoke_session_by_id(client, admin_headers):
    pair = login(client, "admin", "AdminPass123").json()
    sessions = client.get("/auth/sessions", headers=admin_headers).json()
    target = max(s["id"] for s in sessions)

    r = client.delete(f"/auth/sessions/{target}", headers=admin_headers)
    assert r.status_code == 204
    assert (
        client.post(
            "/auth/refresh", json={"refresh_token": pair["refresh_token"]}
        ).status_code
        == 401
    )


def test_cannot_revoke_another_users_session(client, admin_headers, viewer_headers):
    login(client, "viewer", "ViewerPass123")
    viewer_sessions = client.get("/auth/sessions", headers=viewer_headers).json()
    victim_id = viewer_sessions[0]["id"]

    r = client.delete(f"/auth/sessions/{victim_id}", headers=admin_headers)
    assert r.status_code == 404


def test_session_records_resolved_proxy_client_ip(client, admin_headers, monkeypatch):
    monkeypatch.setattr(settings, "trusted_proxies", ["testclient"])
    r = client.post(
        "/auth/login",
        data={"username": "admin", "password": "AdminPass123"},
        headers={"X-Forwarded-For": "203.0.113.11"},
    )
    assert r.status_code == 200, r.text
    sessions = client.get("/auth/sessions", headers=admin_headers).json()
    assert any(s["ip_address"] == "203.0.113.11" for s in sessions)


def test_revoke_all_sessions_requires_auth(client):
    assert client.delete("/auth/sessions").status_code == 401


def test_revoke_all_sessions_ends_every_session(client, admin_headers):
    first = login(client, "admin", "AdminPass123").json()
    second = login(client, "admin", "AdminPass123").json()

    r = client.delete("/auth/sessions", headers=admin_headers)
    assert r.status_code == 204

    assert (
        client.post(
            "/auth/refresh", json={"refresh_token": first["refresh_token"]}
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/auth/refresh", json={"refresh_token": second["refresh_token"]}
        ).status_code
        == 401
    )
    # The caller's own access token is revoked too.
    assert client.get("/auth/me", headers=admin_headers).status_code == 401


def test_revoke_all_sessions_is_audited(client, admin_headers, db):
    from sqlalchemy import select

    from app.models import AuditLog

    client.delete("/auth/sessions", headers=admin_headers)
    rows = db.scalars(
        select(AuditLog).where(AuditLog.action == "auth.sessions.revoked_all")
    ).all()
    assert len(rows) == 1
    assert rows[0].actor == "admin"


def test_revoke_all_sessions_isolated_to_caller(client, admin_headers, viewer_headers):
    viewer = login(client, "viewer", "ViewerPass123").json()
    client.delete("/auth/sessions", headers=admin_headers)
    # The viewer's sessions are untouched.
    assert (
        client.get("/auth/me", headers=viewer_headers).status_code == 200
    )
    assert (
        client.post(
            "/auth/refresh", json={"refresh_token": viewer["refresh_token"]}
        ).status_code
        == 200
    )
