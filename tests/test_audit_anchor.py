from sqlalchemy import select

from app.audit import record_event, verify_audit_chain
from app.models import AuditLog


def _rows(db):
    return db.scalars(select(AuditLog).order_by(AuditLog.id)).all()


def test_anchor_file_is_written_with_the_head(db, tmp_path, monkeypatch):
    from app.config import settings

    anchor = tmp_path / "audit_anchor.log"
    monkeypatch.setattr(settings, "audit_anchor_path", str(anchor))

    record_event(db, action="test.a")
    record_event(db, action="test.b")

    head = _rows(db)[-1]
    lines = anchor.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 2
    assert lines[-1].startswith(f"{head.id}|{head.entry_hash}|")


def test_verify_passes_when_db_matches_the_anchor(db, tmp_path, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "audit_anchor_path", str(tmp_path / "a.log"))
    for i in range(3):
        record_event(db, action=f"test.{i}")

    result = verify_audit_chain(db)
    assert result.valid is True
    assert result.reason is None


def test_verify_detects_a_truncated_tail(db, tmp_path, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "audit_anchor_path", str(tmp_path / "a.log"))
    for action in ("test.a", "test.b", "test.c"):
        record_event(db, action=action)

    rows = _rows(db)
    db.delete(rows[-1])
    db.commit()
    db.expire_all()

    result = verify_audit_chain(db)
    assert result.valid is False
    assert result.reason == "anchor"


def test_verify_detects_a_tampered_anchor_file(db, tmp_path, monkeypatch):
    from app.config import settings

    anchor = tmp_path / "a.log"
    monkeypatch.setattr(settings, "audit_anchor_path", str(anchor))
    record_event(db, action="test.a")

    anchor.write_text(
        "1|deadbeef|2020-01-01T00:00:00+00:00|forged\n", encoding="utf-8"
    )

    result = verify_audit_chain(db)
    assert result.valid is False
    assert result.reason == "anchor"


def test_anchor_is_disabled_when_unset(db):
    record_event(db, action="test.a")
    assert verify_audit_chain(db).valid is True


def test_verify_endpoint_reports_reason(client, admin_headers):
    ok = client.get("/audit/verify", headers=admin_headers)
    assert ok.status_code == 200
    assert "reason" in ok.json()
