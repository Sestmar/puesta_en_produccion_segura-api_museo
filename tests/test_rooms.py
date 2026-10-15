def test_rooms_crud_happy_path(client, admin_headers):
    created = client.post(
        "/rooms",
        json={"name": "Sala Impresionistas", "floor": 1, "description": "Planta baja"},
        headers=admin_headers,
    )
    assert created.status_code == 201
    room = created.json()
    assert room["name"] == "Sala Impresionistas"

    listing = client.get("/rooms")
    assert listing.status_code == 200
    assert listing.json()["total"] == 1
    assert len(listing.json()["items"]) == 1

    updated = client.put(
        f"/rooms/{room['id']}",
        json={"floor": 2},
        headers=admin_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["floor"] == 2

    deleted = client.delete(f"/rooms/{room['id']}", headers=admin_headers)
    assert deleted.status_code == 204


def test_create_room_as_client_returns_403(client, client_headers):
    r = client.post(
        "/rooms", json={"name": "Sala X", "floor": 0}, headers=client_headers
    )
    assert r.status_code == 403


def test_create_room_without_token_returns_401(client):
    r = client.post("/rooms", json={"name": "Sala X", "floor": 0})
    assert r.status_code == 401


def test_create_room_invalid_floor_rejected(client, admin_headers):
    r = client.post(
        "/rooms", json={"name": "Sala Y", "floor": -1}, headers=admin_headers
    )
    assert r.status_code == 422


def test_rooms_are_public_to_read(client, admin_headers):
    client.post(
        "/rooms", json={"name": "Sala Z", "floor": 3}, headers=admin_headers
    )
    r = client.get("/rooms")
    assert r.status_code == 200
