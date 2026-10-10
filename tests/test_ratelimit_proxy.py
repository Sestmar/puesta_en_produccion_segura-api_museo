import pytest
from starlette.requests import Request

from app import config
from app.ratelimit import build_limiter, client_ip, limiter


def make_request(client=("1.2.3.4", 1234), headers=None):
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


def test_no_trusted_proxies_ignores_forwarded_header(monkeypatch):
    monkeypatch.setattr(config.settings, "trusted_proxies", [])
    request = make_request(headers={"x-forwarded-for": "9.9.9.9"})
    assert client_ip(request) == "1.2.3.4"


def test_trusted_peer_uses_forwarded_client(monkeypatch):
    monkeypatch.setattr(config.settings, "trusted_proxies", ["10.0.0.1"])
    request = make_request(
        client=("10.0.0.1", 5555),
        headers={"x-forwarded-for": "203.0.113.7"},
    )
    assert client_ip(request) == "203.0.113.7"


def test_trusted_peer_walks_chain_from_the_right(monkeypatch):
    monkeypatch.setattr(
        config.settings, "trusted_proxies", ["10.0.0.1", "10.0.0.2"]
    )
    request = make_request(
        client=("10.0.0.2", 5555),
        headers={"x-forwarded-for": "203.0.113.7, 10.0.0.1"},
    )
    assert client_ip(request) == "203.0.113.7"


def test_untrusted_peer_ignores_forwarded_header(monkeypatch):
    monkeypatch.setattr(config.settings, "trusted_proxies", ["10.0.0.1"])
    request = make_request(
        client=("8.8.8.8", 5555),
        headers={"x-forwarded-for": "9.9.9.9"},
    )
    assert client_ip(request) == "8.8.8.8"


def test_missing_client_falls_back(monkeypatch):
    monkeypatch.setattr(config.settings, "trusted_proxies", [])
    request = make_request(client=None)
    assert client_ip(request) == "127.0.0.1"


def test_limiter_key_func_is_client_ip():
    assert limiter._key_func is client_ip


def test_build_limiter_defaults_to_memory_storage():
    built = build_limiter(storage_uri=None, default_limit=lambda: "100/minute")
    assert type(built._storage).__name__ == "MemoryStorage"


def test_build_limiter_uses_configured_storage_uri():
    built = build_limiter(
        storage_uri="memory://custom", default_limit=lambda: "100/minute"
    )
    assert built._storage_uri == "memory://custom"


@pytest.mark.parametrize("storage_uri", [None, "memory://"])
def test_limiter_is_configurable_through_settings(monkeypatch, storage_uri):
    monkeypatch.setattr(config.settings, "ratelimit_storage_uri", storage_uri)
    built = build_limiter(
        storage_uri=config.settings.ratelimit_storage_uri,
        default_limit=lambda: config.settings.default_rate_limit,
    )
    assert built._storage is not None
