def test_list_artists_is_public(client, admin_headers):
    client.post(
        "/artists",
        json={"name": "Frida Kahlo", "nationality": "Mexican", "birth_year": 1907},
        headers=admin_headers,
    )
    r = client.get("/artists")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["name"] == "Frida Kahlo"


def test_create_artist_without_token_returns_401(client):
    r = client.post("/artists", json={"name": "Diego Rivera"})
    assert r.status_code == 401


def test_create_artist_as_viewer_returns_403(client, viewer_headers):
    r = client.post("/artists", json={"name": "Diego Rivera"}, headers=viewer_headers)
    assert r.status_code == 403


def test_create_artist_as_admin_returns_201(client, admin_headers):
    r = client.post(
        "/artists",
        json={"name": "  Diego Rivera  ", "birth_year": 1886, "death_year": 1957},
        headers=admin_headers,
    )
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "Diego Rivera"
    assert body["id"] > 0


def test_create_artist_blank_name_rejected(client, admin_headers):
    r = client.post(
        "/artists", json={"name": "   "}, headers=admin_headers
    )
    assert r.status_code == 422


def test_create_artist_death_before_birth_rejected(client, admin_headers):
    r = client.post(
        "/artists",
        json={"name": "X", "birth_year": 1900, "death_year": 1800},
        headers=admin_headers,
    )
    assert r.status_code == 422


def test_get_artist_by_id_returns_404_when_missing(client):
    r = client.get("/artists/9999")
    assert r.status_code == 404


def test_update_artist_as_admin(client, admin_headers):
    created = client.post(
        "/artists", json={"name": "Old Name"}, headers=admin_headers
    ).json()
    r = client.put(
        f"/artists/{created['id']}",
        json={"name": "New Name"},
        headers=admin_headers,
    )
    assert r.status_code == 200
    assert r.json()["name"] == "New Name"


def test_update_artist_without_token_returns_401(client, admin_headers):
    created = client.post(
        "/artists", json={"name": "Some Artist"}, headers=admin_headers
    ).json()
    r = client.put(f"/artists/{created['id']}", json={"name": "Hacked"})
    assert r.status_code == 401


def test_delete_artist_as_admin(client, admin_headers):
    created = client.post(
        "/artists", json={"name": "Temporary"}, headers=admin_headers
    ).json()
    r = client.delete(f"/artists/{created['id']}", headers=admin_headers)
    assert r.status_code == 204
    assert client.get(f"/artists/{created['id']}").status_code == 404


def test_delete_artist_with_artworks_returns_409(client, admin_headers):
    artist = client.post(
        "/artists", json={"name": "With Art"}, headers=admin_headers
    ).json()
    client.post(
        "/artworks",
        json={"title": "Some Painting", "artist_id": artist["id"]},
        headers=admin_headers,
    )
    r = client.delete(f"/artists/{artist['id']}", headers=admin_headers)
    assert r.status_code == 409
