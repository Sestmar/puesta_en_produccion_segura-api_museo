from app.config import settings


def test_default_limit_applies_to_public_endpoints(client, monkeypatch):
    monkeypatch.setattr(settings, "default_rate_limit", "2 per minute")
    assert client.get("/artists").status_code == 200
    assert client.get("/artists").status_code == 200
    assert client.get("/artists").status_code == 429


def test_health_endpoints_are_exempt(client, monkeypatch):
    monkeypatch.setattr(settings, "default_rate_limit", "1 per minute")
    for _ in range(3):
        assert client.get("/health").status_code == 200
        assert client.get("/health/ready").status_code == 200


def test_default_limit_applies_to_authenticated_writes(
    client, admin_headers, monkeypatch
):
    monkeypatch.setattr(settings, "default_rate_limit", "2 per minute")
    assert (
        client.post(
            "/artists", json={"name": "One"}, headers=admin_headers
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/artists", json={"name": "Two"}, headers=admin_headers
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/artists", json={"name": "Three"}, headers=admin_headers
        ).status_code
        == 429
    )