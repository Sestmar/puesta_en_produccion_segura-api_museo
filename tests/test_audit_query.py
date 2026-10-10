from tests.conftest import login


def test_list_audit_requires_admin(client, admin_headers, viewer_headers):
    assert client.get("/audit").status_code == 401
    assert client.get("/audit", headers=viewer_headers).status_code == 403
    r = client.get("/audit", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) >= 1


def test_list_audit_entries_expose_expected_fields(client, admin_headers):
    entry = client.get("/audit", headers=admin_headers).json()[0]
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
    ids = [entry["id"] for entry in client.get("/audit", headers=admin_headers).json()]
    assert ids == sorted(ids, reverse=True)


def test_list_audit_filters_by_action(client, admin_headers):
    r = client.get("/audit?action=auth.register", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1
    assert all(entry["action"] == "auth.register" for entry in r.json())


def test_list_audit_filters_by_actor(client, admin_headers):
    r = client.get("/audit?actor=admin", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1
    assert all(entry["actor"] == "admin" for entry in r.json())


def test_list_audit_supports_pagination(client, admin_headers):
    for _ in range(3):
        login(client, "admin", "AdminPass123")
    full = client.get("/audit?limit=100", headers=admin_headers).json()
    assert len(full) >= 5
    page = client.get("/audit?limit=2&skip=2", headers=admin_headers).json()
    assert [entry["id"] for entry in page] == [entry["id"] for entry in full[2:4]]
