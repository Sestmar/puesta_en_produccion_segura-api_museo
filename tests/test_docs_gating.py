from app.config import settings

DOCS_PATHS = ["/docs", "/redoc", "/openapi.json"]


def test_docs_available_outside_production(client):
    for path in DOCS_PATHS:
        assert client.get(path).status_code == 200, path


def test_docs_hidden_in_production(client, monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    for path in DOCS_PATHS:
        assert client.get(path).status_code == 404, path


def test_api_routes_unaffected_in_production(client, monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    assert client.get("/health").status_code == 200
