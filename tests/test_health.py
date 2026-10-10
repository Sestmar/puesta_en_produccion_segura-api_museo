def test_liveness(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_readiness_ok(client):
    r = client.get("/health/ready")
    assert r.status_code == 200
    assert r.json() == {"status": "ready"}


def test_readiness_returns_503_when_database_is_down(client):
    from app.database import get_db
    from app.main import app

    class _BrokenSession:
        def execute(self, *args, **kwargs):
            raise RuntimeError("database down")

    def broken_db():
        yield _BrokenSession()

    app.dependency_overrides[get_db] = broken_db
    try:
        r = client.get("/health/ready")
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 503
    assert r.json()["detail"] == "Database unavailable"
