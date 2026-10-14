from app.security import create_access_token, decode_token
from tests.conftest import login, refresh_cookie


def _bearer(token):
    return {"Authorization": f"Bearer {token}"}


def test_access_token_carries_session_id(client, admin_headers):
    token = admin_headers["Authorization"].removeprefix("Bearer ")
    payload = decode_token(token)
    assert isinstance(payload.get("sid"), int)


def test_logout_invalidates_its_access_token(client, admin_headers):
    r = login(client, "admin", "AdminPass123")
    token = r.json()["access_token"]
    headers = _bearer(token)
    assert client.get("/auth/me", headers=headers).status_code == 200

    client.post("/auth/logout", cookies={"refresh_token": refresh_cookie(r)})
    assert client.get("/auth/me", headers=headers).status_code == 401


def test_revoking_session_invalidates_its_access_token(client, admin_headers):
    r = login(client, "admin", "AdminPass123")
    token = r.json()["access_token"]
    headers = _bearer(token)
    assert client.get("/auth/me", headers=headers).status_code == 200

    sessions = client.get("/auth/sessions", headers=admin_headers).json()
    target = max(s["id"] for s in sessions)
    client.delete(f"/auth/sessions/{target}", headers=admin_headers)
    assert client.get("/auth/me", headers=headers).status_code == 401


def test_refresh_rotation_invalidates_old_access_token(client, admin_headers):
    r = login(client, "admin", "AdminPass123")
    old_headers = _bearer(r.json()["access_token"])
    rotated = client.post(
        "/auth/refresh", cookies={"refresh_token": refresh_cookie(r)}
    ).json()

    assert client.get("/auth/me", headers=old_headers).status_code == 401
    assert (
        client.get("/auth/me", headers=_bearer(rotated["access_token"])).status_code
        == 200
    )


def test_reuse_detection_revokes_all_access_tokens(client, admin_headers):
    first = login(client, "admin", "AdminPass123")
    second = login(client, "admin", "AdminPass123")
    second_headers = _bearer(second.json()["access_token"])
    assert client.get("/auth/me", headers=second_headers).status_code == 200

    client.post("/auth/refresh", cookies={"refresh_token": refresh_cookie(first)})
    client.post("/auth/refresh", cookies={"refresh_token": refresh_cookie(first)})
    assert client.get("/auth/me", headers=second_headers).status_code == 401


def test_token_with_unknown_session_is_rejected(client, admin_headers):
    forged = create_access_token(
        subject="admin", role="admin", session_id=999999
    )
    assert client.get("/auth/me", headers=_bearer(forged)).status_code == 401
