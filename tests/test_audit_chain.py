from sqlalchemy import select, text

from app.audit import record_event, verify_audit_chain
from app.models import AuditLog


def _rows(db):
    return db.scalars(select(AuditLog).order_by(AuditLog.id)).all()


def test_first_entry_has_no_prev_and_a_hash(db):
    record_event(db, action="test.a")
    row = _rows(db)[0]
    assert row.prev_hash is None
    assert row.entry_hash is not None
    assert len(row.entry_hash) == 64


def test_chain_links_each_entry_to_the_previous(db):
    for action in ("test.a", "test.b", "test.c"):
        record_event(db, action=action)
    first, second, third = _rows(db)
    assert first.prev_hash is None
    assert second.prev_hash == first.entry_hash
    assert third.prev_hash == second.entry_hash


def test_verify_passes_on_an_untouched_chain(db):
    for i in range(3):
        record_event(db, action=f"test.{i}")
    result = verify_audit_chain(db)
    assert result.valid is True
    assert result.checked == 3
    assert result.first_invalid_id is None


def test_verify_passes_on_an_empty_table(db):
    result = verify_audit_chain(db)
    assert result.valid is True
    assert result.checked == 0


def test_verify_detects_a_modified_field(db):
    record_event(db, action="test.a")
    record_event(db, action="test.b")
    tampered = _rows(db)[1]
    tampered.action = "test.tampered"
    db.commit()
    result = verify_audit_chain(db)
    assert result.valid is False
    assert result.first_invalid_id == tampered.id


def test_verify_detects_a_deleted_entry(db):
    for action in ("test.a", "test.b", "test.c"):
        record_event(db, action=action)
    rows = _rows(db)
    db.delete(rows[1])
    db.commit()
    result = verify_audit_chain(db)
    assert result.valid is False
    assert result.first_invalid_id == rows[2].id


def test_verify_detects_out_of_band_tampering(db):
    record_event(db, action="test.a")
    record_event(db, action="test.b")
    db.execute(text("UPDATE audit_logs SET actor = 'attacker' WHERE action = 'test.a'"))
    db.commit()
    db.expire_all()
    result = verify_audit_chain(db)
    assert result.valid is False


def test_verify_endpoint_requires_admin(client, admin_headers, client_headers):
    forbidden = client.get("/audit/verify", headers=client_headers)
    assert forbidden.status_code == 403

    ok = client.get("/audit/verify", headers=admin_headers)
    assert ok.status_code == 200
    body = ok.json()
    assert body["valid"] is True
    assert body["checked"] >= 1
    assert body["first_invalid_id"] is None


def test_api_generated_events_form_a_valid_chain(client, admin_headers, db):
    assert verify_audit_chain(db).valid is True
