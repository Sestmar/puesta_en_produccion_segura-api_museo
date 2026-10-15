import pytest
import sqlalchemy as sa
from alembic.config import Config
from sqlalchemy import delete, select

from alembic import command
from app.config import settings
from app.models import Favorite, User
from tests.conftest import login


@pytest.fixture()
def artworks(client, admin_headers):
    artist = client.post(
        "/artists", json={"name": "Velázquez"}, headers=admin_headers
    ).json()
    ids = []
    for title in ("Las Meninas", "Las Hilanderas", "La fragua de Vulcano"):
        r = client.post(
            "/artworks",
            json={"title": title, "artist_id": artist["id"]},
            headers=admin_headers,
        )
        ids.append(r.json()["id"])
    return ids


@pytest.fixture()
def other_client_headers(client, admin_headers):
    client.post(
        "/auth/register",
        json={"username": "other", "password": "OtherPass123"},
        headers=admin_headers,
    )
    token = login(client, "other", "OtherPass123").json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _ids(client, headers):
    r = client.get("/me/favorites/ids", headers=headers)
    assert r.status_code == 200
    return r.json()


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/me/favorites"),
        ("get", "/me/favorites/ids"),
        ("put", "/me/favorites/1"),
        ("delete", "/me/favorites/1"),
    ],
)
def test_favorites_require_authentication(client, method, path):
    assert getattr(client, method)(path).status_code == 401


def test_add_list_and_remove_favorites(client, client_headers, artworks):
    first, second, _ = artworks
    assert client.put(f"/me/favorites/{first}", headers=client_headers).status_code == 204
    assert client.put(f"/me/favorites/{second}", headers=client_headers).status_code == 204
    assert _ids(client, client_headers) == sorted([first, second])

    page = client.get("/me/favorites", headers=client_headers).json()
    assert page["total"] == 2
    assert {item["id"] for item in page["items"]} == {first, second}
    assert {"title", "artist_id", "room_id"} <= page["items"][0].keys()

    assert (
        client.delete(f"/me/favorites/{first}", headers=client_headers).status_code
        == 204
    )
    assert _ids(client, client_headers) == [second]


def test_add_favorite_is_idempotent(client, client_headers, artworks):
    for _ in range(3):
        r = client.put(f"/me/favorites/{artworks[0]}", headers=client_headers)
        assert r.status_code == 204
    assert _ids(client, client_headers) == [artworks[0]]


def test_remove_missing_favorite_is_idempotent(client, client_headers, artworks):
    r = client.delete(f"/me/favorites/{artworks[0]}", headers=client_headers)
    assert r.status_code == 204
    assert client.delete("/me/favorites/999999", headers=client_headers).status_code == 204


def test_add_unknown_artwork_returns_404(client, client_headers):
    r = client.put("/me/favorites/999999", headers=client_headers)
    assert r.status_code == 404
    assert r.json()["detail"] == "Artwork not found"


def test_favorites_are_isolated_between_users(
    client, client_headers, other_client_headers, artworks
):
    client.put(f"/me/favorites/{artworks[0]}", headers=client_headers)
    client.put(f"/me/favorites/{artworks[1]}", headers=other_client_headers)

    assert _ids(client, client_headers) == [artworks[0]]
    assert _ids(client, other_client_headers) == [artworks[1]]
    assert client.get("/me/favorites", headers=other_client_headers).json()["total"] == 1

    # Removing "someone else's" artwork only touches the caller's own list.
    client.delete(f"/me/favorites/{artworks[0]}", headers=other_client_headers)
    assert _ids(client, client_headers) == [artworks[0]]


def test_every_role_can_use_favorites(
    client, admin_headers, manager_headers, client_headers, artworks
):
    for headers in (admin_headers, manager_headers, client_headers):
        assert client.put(f"/me/favorites/{artworks[2]}", headers=headers).status_code == 204
        assert _ids(client, headers) == [artworks[2]]


def test_list_favorites_paginates(client, client_headers, artworks):
    for artwork_id in artworks:
        client.put(f"/me/favorites/{artwork_id}", headers=client_headers)
    page = client.get(
        "/me/favorites", params={"skip": 1, "limit": 1}, headers=client_headers
    ).json()
    assert page["total"] == 3
    assert len(page["items"]) == 1
    assert (page["skip"], page["limit"]) == (1, 1)


def test_deleting_artwork_removes_it_from_favorites(
    client, admin_headers, client_headers, artworks
):
    client.put(f"/me/favorites/{artworks[0]}", headers=client_headers)
    client.put(f"/me/favorites/{artworks[1]}", headers=client_headers)
    assert client.delete(f"/artworks/{artworks[0]}", headers=admin_headers).status_code == 204
    assert _ids(client, client_headers) == [artworks[1]]


def test_deleting_user_removes_their_favorites(client, client_headers, artworks, db):
    client.put(f"/me/favorites/{artworks[0]}", headers=client_headers)
    db.execute(delete(User).where(User.username == "client"))
    db.commit()
    assert db.scalars(select(Favorite)).all() == []


def test_favorites_migration_upgrades_and_downgrades(tmp_path, monkeypatch):
    url = f"sqlite:///{(tmp_path / 'migration.db').as_posix()}"
    monkeypatch.setattr(settings, "database_url", url)
    cfg = Config()
    cfg.set_main_option("script_location", "alembic")
    engine = sa.create_engine(url)

    command.upgrade(cfg, "head")
    assert "favorites" in sa.inspect(engine).get_table_names()
    command.downgrade(cfg, "c3e8f1a9b2d4")
    assert "favorites" not in sa.inspect(engine).get_table_names()
    command.upgrade(cfg, "head")
    assert "favorites" in sa.inspect(engine).get_table_names()
    engine.dispose()
