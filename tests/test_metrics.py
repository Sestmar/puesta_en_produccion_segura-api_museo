import re

from app.config import settings
from app.database import build_engine


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
