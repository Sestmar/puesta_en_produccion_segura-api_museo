from tests.conftest import login


def test_session_cap_evicts_the_oldest(client, admin_headers, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "max_sessions_per_user", 2)

    first = login(client, "admin", "AdminPass123").json()
    login(client, "admin", "AdminPass123")
    third = login(client, "admin", "AdminPass123").json()

    live = {"Authorization": f"Bearer {third['access_token']}"}
    sessions = client.get("/auth/sessions", headers=live).json()
    assert len(sessions) == 2

    assert (
        client.post(
            "/auth/refresh", json={"refresh_token": third["refresh_token"]}
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/auth/refresh", json={"refresh_token": first["refresh_token"]}
        ).status_code
        == 401
    )


def test_session_cap_keeps_sessions_up_to_the_limit(client, admin_headers, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "max_sessions_per_user", 5)
    login(client, "admin", "AdminPass123")
    login(client, "admin", "AdminPass123")
    sessions = client.get("/auth/sessions", headers=admin_headers).json()
    assert len(sessions) == 3
