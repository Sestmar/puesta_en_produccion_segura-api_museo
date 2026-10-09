def test_health_endpoint(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_security_headers_present(client):
    r = client.get("/health")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    assert r.headers["Referrer-Policy"] == "no-referrer"
    assert r.headers["Cross-Origin-Opener-Policy"] == "same-origin"


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
