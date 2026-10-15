from tests.conftest import login


def test_list_audit_requires_admin(client, admin_headers, client_headers):
    assert client.get("/audit").status_code == 401
    assert client.get("/audit", headers=client_headers).status_code == 403
    r = client.get("/audit", headers=admin_headers)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert data["total"] >= 1
    assert isinstance(data["items"], list)
    assert len(data["items"]) >= 1


def test_list_audit_entries_expose_expected_fields(client, admin_headers):
    data = client.get("/audit", headers=admin_headers).json()
    entry = data["items"][0]
    for field in (
        "id",
        "created_at",
        "action",
        "actor",
        "resource_type",
        "resource_id",
        "details",
        "ip_address",
        "user_agent",
        "request_id",
    ):
        assert field in entry


def test_list_audit_is_ordered_newest_first(client, admin_headers):
    items = client.get("/audit", headers=admin_headers).json()["items"]
    ids = [entry["id"] for entry in items]
    assert ids == sorted(ids, reverse=True)


def test_list_audit_filters_by_action(client, admin_headers):
    r = client.get("/audit?action=auth.register", headers=admin_headers)
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) >= 1
    assert all(entry["action"] == "auth.register" for entry in items)


def test_list_audit_filters_by_actor(client, admin_headers):
    r = client.get("/audit?actor=admin", headers=admin_headers)
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) >= 1
    assert all(entry["actor"] == "admin" for entry in items)


def test_list_audit_supports_pagination(client, admin_headers):
    for _ in range(3):
        login(client, "admin", "AdminPass123")
    full_data = client.get("/audit?limit=100", headers=admin_headers).json()
    full_items = full_data["items"]
    assert len(full_items) >= 5
    page = client.get("/audit?limit=2&skip=2", headers=admin_headers).json()
    assert page["total"] >= 5
    assert [entry["id"] for entry in page["items"]] == [
        entry["id"] for entry in full_items[2:4]
    ]
