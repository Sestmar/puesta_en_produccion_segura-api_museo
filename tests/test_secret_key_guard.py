import pytest
from fastapi.testclient import TestClient

from app.config import INSECURE_SECRET_KEYS, validate_secret_key

PRODUCTION = "production"
STRONG_SECRET = "a-strong-random-secret-key-with-32+bytes!!"


@pytest.mark.parametrize("insecure", sorted(INSECURE_SECRET_KEYS))
def test_production_rejects_known_insecure_secrets(insecure):
    with pytest.raises(RuntimeError):
        validate_secret_key(insecure, PRODUCTION)


def test_production_rejects_short_secret():
    with pytest.raises(RuntimeError):
        validate_secret_key("short-secret", PRODUCTION)


def test_production_accepts_strong_secret():
    validate_secret_key(STRONG_SECRET, PRODUCTION)


def test_development_allows_insecure_secret():
    validate_secret_key("insecure-dev-secret-change-me", "development")


def test_startup_guard_is_wired_in_production(monkeypatch):
    import app.main as main

    monkeypatch.setattr(main.settings, "environment", PRODUCTION)
    monkeypatch.setattr(
        main.settings, "secret_key", "dev-only-secret-change-me-please-32-bytes"
    )
    with pytest.raises(RuntimeError):
        with TestClient(main.app):
            pass
