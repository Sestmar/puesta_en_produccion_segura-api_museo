def _seed(client, admin_headers):
    artist = client.post(
        "/artists", json={"name": "Monet"}, headers=admin_headers
    ).json()
    room = client.post(
        "/rooms", json={"name": "Sala Agua", "floor": 0}, headers=admin_headers
    ).json()
    return artist, room


def test_create_artwork_with_valid_references(client, admin_headers):
    artist, room = _seed(client, admin_headers)
    r = client.post(
        "/artworks",
        json={
            "title": "Nymphas",
            "year": 1919,
            "technique": "Oil on canvas",
            "artist_id": artist["id"],
            "room_id": room["id"],
        },
        headers=admin_headers,
    )
    assert r.status_code == 201
    body = r.json()
    assert body["artist_id"] == artist["id"]
    assert body["room_id"] == room["id"]


def test_create_artwork_without_room_is_allowed(client, admin_headers):
    artist, _ = _seed(client, admin_headers)
    r = client.post(
        "/artworks",
        json={"title": "Sin sala", "artist_id": artist["id"]},
        headers=admin_headers,
    )
    assert r.status_code == 201
    assert r.json()["room_id"] is None


def test_create_artwork_with_unknown_artist_rejected(client, admin_headers):
    r = client.post(
        "/artworks",
        json={"title": "Fantasma", "artist_id": 9999},
        headers=admin_headers,
    )
    assert r.status_code == 422


def test_create_artwork_with_unknown_room_rejected(client, admin_headers):
    artist, _ = _seed(client, admin_headers)
    r = client.post(
        "/artworks",
        json={"title": "Fantasma", "artist_id": artist["id"], "room_id": 9999},
        headers=admin_headers,
    )
    assert r.status_code == 422


def test_create_artwork_requires_admin(client, viewer_headers):
    r = client.post(
        "/artworks",
        json={"title": "No", "artist_id": 1},
        headers=viewer_headers,
    )
    assert r.status_code == 403


def test_list_artworks_is_public_and_filterable(client, admin_headers):
    artist, room = _seed(client, admin_headers)
    other_room = client.post(
        "/rooms", json={"name": "Sala Rara", "floor": 9}, headers=admin_headers
    ).json()
    client.post(
        "/artworks",
        json={"title": "En sala agua", "artist_id": artist["id"], "room_id": room["id"]},
        headers=admin_headers,
    )
    client.post(
        "/artworks",
        json={"title": "En sala rara", "artist_id": artist["id"], "room_id": other_room["id"]},
        headers=admin_headers,
    )

    all_artworks = client.get("/artworks")
    assert all_artworks.status_code == 200
    assert len(all_artworks.json()) == 2

    filtered = client.get("/artworks", params={"room_id": room["id"]})
    assert filtered.status_code == 200
    assert len(filtered.json()) == 1
    assert filtered.json()[0]["title"] == "En sala agua"

    by_artist = client.get("/artworks", params={"artist_id": artist["id"]})
    assert len(by_artist.json()) == 2


def test_get_artwork_returns_404_when_missing(client):
    r = client.get("/artworks/12345")
    assert r.status_code == 404


def test_delete_room_with_artworks_returns_409(client, admin_headers):
    artist, room = _seed(client, admin_headers)
    client.post(
        "/artworks",
        json={"title": "Ocupa sala", "artist_id": artist["id"], "room_id": room["id"]},
        headers=admin_headers,
    )
    r = client.delete(f"/rooms/{room['id']}", headers=admin_headers)
    assert r.status_code == 409
