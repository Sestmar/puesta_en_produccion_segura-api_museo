def test_health_endpoint(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_request_id_header_is_generated(client):
    r = client.get("/health")
    assert r.headers.get("X-Request-ID")


def test_request_id_header_is_propagated(client):
    r = client.get("/health", headers={"X-Request-ID": "trace-abc-123"})
    assert r.headers.get("X-Request-ID") == "trace-abc-123"


def test_security_headers_present(client):
    r = client.get("/health")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    assert r.headers["Referrer-Policy"] == "no-referrer"
    assert r.headers["Cross-Origin-Opener-Policy"] == "same-origin"


def test_content_security_policy_present(client):
    r = client.get("/health")
    policy = r.headers["Content-Security-Policy"]
    assert "default-src 'none'" in policy
    assert "frame-ancestors 'none'" in policy


def test_https_redirect_disabled_by_default(client):
    r = client.get("/health", follow_redirects=False)
    assert r.status_code == 200


def test_https_redirect_when_enabled(client, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "force_https", True)
    r = client.get("/health", follow_redirects=False)
    assert r.status_code in (307, 308)
    assert r.headers["location"].startswith("https://")


def test_https_redirect_respects_forwarded_proto(client, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "force_https", True)
    r = client.get(
        "/health",
        headers={"X-Forwarded-Proto": "https"},
        follow_redirects=False,
    )
    assert r.status_code == 200


def test_hsts_header_absent_outside_production(client):
    r = client.get("/health")
    assert "Strict-Transport-Security" not in r.headers


def test_cors_allows_configured_origin(client):
    r = client.get(
        "/health", headers={"Origin": "http://localhost:3000"}
    )
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_cors_blocks_unknown_origin(client):
    r = client.get(
        "/health", headers={"Origin": "https://evil.example"}
    )
    assert "access-control-allow-origin" not in r.headers


def test_cors_preflight_for_allowed_origin(client):
    r = client.options(
        "/artworks",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Authorization,Content-Type",
        },
    )
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert "Authorization" in r.headers.get("access-control-allow-headers", "")


def test_openapi_docs_are_available(client):
    r = client.get("/openapi.json")
    assert r.status_code == 200
    paths = r.json()["paths"]
    assert "/auth/login" in paths
    assert "/artworks" in paths
