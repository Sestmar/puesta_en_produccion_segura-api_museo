import json
import logging

from sqlalchemy import select
from starlette.requests import Request

from app.config import settings
from app.logging_config import JsonFormatter
from app.models import AuditLog


def _make_request(client=("1.2.3.4", 1234), headers=None):
    raw_headers = [
        (key.lower().encode("latin-1"), value.encode("latin-1"))
        for key, value in (headers or {}).items()
    ]
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": raw_headers,
        "client": client,
    }
    return Request(scope)


def _audit_rows(db, action):
    return db.scalars(select(AuditLog).where(AuditLog.action == action)).all()


def test_resolve_client_ip_returns_none_without_client(monkeypatch):
    from app.client_ip import resolve_client_ip

    monkeypatch.setattr(settings, "trusted_proxies", [])
    assert resolve_client_ip(_make_request(client=None)) is None


def test_resolve_client_ip_uses_forwarded_when_trusted(monkeypatch):
    from app.client_ip import resolve_client_ip

    monkeypatch.setattr(settings, "trusted_proxies", ["10.0.0.1"])
    request = _make_request(
        client=("10.0.0.1", 1), headers={"x-forwarded-for": "203.0.113.7"}
    )
    assert resolve_client_ip(request) == "203.0.113.7"


def test_access_log_uses_resolved_proxy_client_ip(client, monkeypatch):
    monkeypatch.setattr(settings, "trusted_proxies", ["testclient"])
    captured: list[dict] = []

    class _Capture(logging.Handler):
        def emit(self, record):
            captured.append(json.loads(self.format(record)))

    handler = _Capture()
    handler.setFormatter(JsonFormatter())
    access_logger = logging.getLogger("app.access")
    access_logger.addHandler(handler)
    try:
        client.get("/health", headers={"X-Forwarded-For": "203.0.113.7"})
    finally:
        access_logger.removeHandler(handler)

    entry = next(i for i in captured if i.get("message") == "request completed")
    assert entry["client_ip"] == "203.0.113.7"


def test_audit_uses_resolved_proxy_client_ip(client, db, monkeypatch):
    monkeypatch.setattr(settings, "trusted_proxies", ["testclient"])
    r = client.post(
        "/auth/register",
        json={"username": "admin", "password": "AdminPass123"},
        headers={"X-Forwarded-For": "203.0.113.9"},
    )
    assert r.status_code == 201, r.text
    rows = _audit_rows(db, "auth.register")
    assert rows and rows[0].ip_address == "203.0.113.9"


def test_audit_ignores_forwarded_without_trusted_proxy(client, db, monkeypatch):
    monkeypatch.setattr(settings, "trusted_proxies", [])
    r = client.post(
        "/auth/register",
        json={"username": "admin", "password": "AdminPass123"},
        headers={"X-Forwarded-For": "203.0.113.9"},
    )
    assert r.status_code == 201, r.text
    rows = _audit_rows(db, "auth.register")
    assert rows and rows[0].ip_address == "testclient"
