import re

import pytest
from starlette.requests import Request

from app.config import settings
from app.database import build_engine
from app.routers.metrics import metrics_access_allowed


def test_metrics_endpoint_returns_prometheus_format(client):
    r = client.get("/metrics")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/plain")
    assert "# TYPE http_requests_total counter" in r.text
    assert "# TYPE http_request_duration_seconds histogram" in r.text


def test_metrics_expose_api_request_samples(client):
    client.get("/artists")
    body = client.get("/metrics").text
    assert re.search(r'http_requests_total\{[^}]*method="GET"', body)
    assert re.search(r'http_requests_total\{[^}]*status="200"', body)


def test_metrics_exclude_the_metrics_route_itself(client):
    body = client.get("/metrics").text
    assert 'path="/metrics"' not in body


def test_metrics_count_audit_events(client, admin_headers):
    client.post("/auth/login", data={"username": "admin", "password": "wrong-pass"})
    body = client.get("/metrics").text
    assert 'audit_events_total{action="auth.login.failed"}' in body


def test_metrics_endpoint_is_rate_limit_exempt(client):
    from app.ratelimit import limiter

    assert "app.routers.metrics.metrics" in limiter._exempt_routes


def _request(peer, headers=None):
    raw = [(k.encode("latin-1"), v.encode("latin-1")) for k, v in (headers or {}).items()]
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/metrics",
        "headers": raw,
        "client": peer,
    }
    return Request(scope)


def test_metrics_are_public_when_no_networks_are_configured(monkeypatch):
    monkeypatch.setattr(settings, "metrics_allowed_networks", [])
    assert metrics_access_allowed(_request(("203.0.113.7", 1), {"x-forwarded-for": "1.1.1.1"}))


def test_metrics_allow_direct_scrape_from_internal_network(monkeypatch):
    monkeypatch.setattr(settings, "metrics_allowed_networks", ["10.0.0.0/8"])
    assert metrics_access_allowed(_request(("10.0.1.9", 1)))


@pytest.mark.parametrize("header", ["x-forwarded-for", "x-real-ip", "forwarded"])
def test_metrics_refuse_proxied_requests_even_from_internal_peer(monkeypatch, header):
    """Traffic from the internet reaches the API through the proxy, whose IP is internal."""
    monkeypatch.setattr(settings, "metrics_allowed_networks", ["10.0.0.0/8"])
    assert not metrics_access_allowed(_request(("10.0.1.9", 1), {header: "203.0.113.7"}))


def test_metrics_refuse_peers_outside_the_allowed_networks(monkeypatch):
    monkeypatch.setattr(settings, "metrics_allowed_networks", ["10.0.0.0/8"])
    assert not metrics_access_allowed(_request(("172.18.0.5", 1)))
    assert not metrics_access_allowed(_request(None))


def test_restricted_metrics_answer_404_through_the_api(client, monkeypatch):
    monkeypatch.setattr(settings, "metrics_allowed_networks", ["10.0.0.0/8"])
    r = client.get("/metrics", headers={"X-Forwarded-For": "203.0.113.7"})
    assert r.status_code == 404
    assert "http_requests_total" not in r.text


def test_db_pool_settings_defaults():
    assert settings.db_pool_size == 5
    assert settings.db_max_overflow == 10
    assert settings.db_pool_recycle_seconds == 1800
    assert settings.db_pool_pre_ping is True


def test_postgres_engine_applies_production_pool():
    engine = build_engine("postgresql+psycopg://user:pass@localhost/museum")
    assert engine.pool.size() == settings.db_pool_size
    assert engine.pool._max_overflow == settings.db_max_overflow
    assert engine.pool._pre_ping is settings.db_pool_pre_ping
    assert engine.pool._recycle == settings.db_pool_recycle_seconds


def test_sqlite_engine_ignores_pool_tuning():
    engine = build_engine("sqlite:///./pool_test.db")
    assert engine.dialect.name == "sqlite"
    assert engine.pool._recycle == -1
