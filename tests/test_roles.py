import pytest
import sqlalchemy as sa
from alembic.config import Config

from alembic import command
from app.config import settings


def test_admin_can_register_manager(client, admin_headers):
    r = client.post(
        "/auth/register",
        json={"username": "gestor1", "password": "Gestor1Pass", "role": "manager"},
        headers=admin_headers,
    )
    assert r.status_code == 201
    assert r.json()["role"] == "manager"


def test_register_defaults_to_client(client, admin_headers):
    r = client.post(
        "/auth/register",
        json={"username": "plain", "password": "PlainPass123"},
        headers=admin_headers,
    )
    assert r.status_code == 201
    assert r.json()["role"] == "client"


def test_legacy_viewer_role_rejected(client, admin_headers):
    r = client.post(
        "/auth/register",
        json={"username": "legacy", "password": "LegacyPass1", "role": "viewer"},
        headers=admin_headers,
    )
    assert r.status_code == 422


def test_manager_can_manage_catalog(client, manager_headers):
    artist = client.post(
        "/artists", json={"name": "Sorolla"}, headers=manager_headers
    )
    assert artist.status_code == 201
    room = client.post(
        "/rooms", json={"name": "Sala Luz", "floor": 1}, headers=manager_headers
    )
    assert room.status_code == 201
    artwork = client.post(
        "/artworks",
        json={
            "title": "Paseo a orillas del mar",
            "artist_id": artist.json()["id"],
            "room_id": room.json()["id"],
        },
        headers=manager_headers,
    )
    assert artwork.status_code == 201

    artwork_id = artwork.json()["id"]
    updated = client.put(
        f"/artworks/{artwork_id}", json={"year": 1909}, headers=manager_headers
    )
    assert updated.status_code == 200
    assert (
        client.delete(f"/artworks/{artwork_id}", headers=manager_headers).status_code
        == 204
    )


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/users"),
        ("patch", "/users/1"),
        ("get", "/audit"),
        ("get", "/audit/verify"),
        ("post", "/auth/register"),
    ],
)
def test_manager_cannot_access_admin_areas(client, manager_headers, method, path):
    kwargs = {"headers": manager_headers}
    if method in ("patch", "post"):
        kwargs["json"] = {"username": "x-user", "password": "Xpassword1"}
    r = getattr(client, method)(path, **kwargs)
    assert r.status_code == 403


def test_admin_can_promote_client_to_manager(client, admin_headers, client_headers):
    client_user = client.get("/auth/me", headers=client_headers).json()
    assert (
        client.post(
            "/artists", json={"name": "Antes"}, headers=client_headers
        ).status_code
        == 403
    )
    r = client.patch(
        f"/users/{client_user['id']}",
        json={"role": "manager"},
        headers=admin_headers,
    )
    assert r.status_code == 200
    assert r.json()["role"] == "manager"
    assert (
        client.post(
            "/artists", json={"name": "Después"}, headers=client_headers
        ).status_code
        == 201
    )


def test_role_migration_maps_viewer_to_client(tmp_path, monkeypatch):
    url = f"sqlite:///{(tmp_path / 'migration.db').as_posix()}"
    monkeypatch.setattr(settings, "database_url", url)
    cfg = Config()
    cfg.set_main_option("script_location", "alembic")

    command.upgrade(cfg, "a7c8d9e0f1a2")
    engine = sa.create_engine(url)
    with engine.begin() as conn:
        conn.execute(
            sa.text(
                "INSERT INTO users (username, hashed_password, role, "
                "failed_login_attempts, is_active) VALUES "
                "('legacy', 'x', 'viewer', 0, 1), ('boss', 'x', 'admin', 0, 1)"
            )
        )

    command.upgrade(cfg, "head")
    with engine.connect() as conn:
        roles = dict(conn.execute(sa.text("SELECT username, role FROM users")).all())
    assert roles == {"legacy": "client", "boss": "admin"}

    with engine.begin() as conn:
        conn.execute(
            sa.text(
                "INSERT INTO users (username, hashed_password, role, "
                "failed_login_attempts, is_active) VALUES ('gestor', 'x', 'manager', 0, 1)"
            )
        )
    command.downgrade(cfg, "a7c8d9e0f1a2")
    with engine.connect() as conn:
        roles = dict(conn.execute(sa.text("SELECT username, role FROM users")).all())
    assert roles == {"legacy": "viewer", "boss": "admin", "gestor": "viewer"}
    engine.dispose()
