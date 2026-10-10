from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.audit import hash_audit_entry, verify_audit_chain
from app.models import AuditCheckpoint, AuditLog, AuthSession, User
from app.retention import prune_audit_logs, prune_expired_sessions
from app.security import generate_refresh_token, hash_password, hash_refresh_token


def _utcnow():
    return datetime.now(UTC)


def _make_user(db):
    user = User(
        username="retention-user",
        hashed_password=hash_password("Retention1"),
        role="viewer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _add_session(db, user, *, expires_in_days, revoked_days_ago=None):
    now = _utcnow()
    session = AuthSession(
        user_id=user.id,
        refresh_token_hash=hash_refresh_token(generate_refresh_token()),
        created_at=now,
        expires_at=now + timedelta(days=expires_in_days),
    )
    if revoked_days_ago is not None:
        session.revoked_at = now - timedelta(days=revoked_days_ago)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def _insert_entry(db, created_at, action, prev_hash):
    entry_hash = hash_audit_entry(
        created_at=created_at,
        action=action,
        actor=None,
        resource_type=None,
        resource_id=None,
        details=None,
        ip_address=None,
        user_agent=None,
        request_id=None,
        prev_hash=prev_hash,
    )
    row = AuditLog(
        action=action,
        created_at=created_at,
        prev_hash=prev_hash,
        entry_hash=entry_hash,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _build_chain(db, *, old_days):
    """Insert entries: first ``len(old_days)`` older than the window, rest recent."""
    now = _utcnow()
    rows = []
    prev = None
    for i, offset in enumerate(old_days):
        row = _insert_entry(db, now - timedelta(days=offset), f"test.{i}", prev)
        rows.append(row)
        prev = row.entry_hash
    return now, rows


def test_prune_sessions_removes_expired_and_long_revoked(db, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "session_retention_days", 7)
    user = _make_user(db)
    active = _add_session(db, user, expires_in_days=10)
    _add_session(db, user, expires_in_days=-30)
    recent_revoked = _add_session(db, user, expires_in_days=10, revoked_days_ago=1)
    _add_session(db, user, expires_in_days=10, revoked_days_ago=30)

    removed = prune_expired_sessions(db)

    assert removed == 2
    remaining = {s.id for s in db.scalars(select(AuthSession)).all()}
    assert remaining == {active.id, recent_revoked.id}


def test_prune_sessions_keeps_fresh_revoked_but_not_young(db, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "session_retention_days", 14)
    user = _make_user(db)
    revoked_today = _add_session(db, user, expires_in_days=10, revoked_days_ago=0)
    assert prune_expired_sessions(db) == 0
    assert db.get(AuthSession, revoked_today.id) is not None


def test_audit_retention_is_disabled_by_default(db):
    _build_chain(db, old_days=[30, 20, 10, 3, 2, 1])
    assert prune_audit_logs(db) == 0
    assert len(db.scalars(select(AuditLog)).all()) == 6


def test_prune_audit_logs_keeps_chain_verifiable(db, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "audit_retention_days", 7)
    now, rows = _build_chain(db, old_days=[30, 20, 10, 3, 2, 1])

    removed = prune_audit_logs(db, now=now)

    assert removed == 3
    remaining = db.scalars(select(AuditLog).order_by(AuditLog.id)).all()
    assert [r.id for r in remaining] == [rows[3].id, rows[4].id, rows[5].id]

    checkpoint = db.get(AuditCheckpoint, 1)
    assert checkpoint is not None
    assert checkpoint.through_id == rows[2].id
    assert checkpoint.entry_hash == rows[2].entry_hash

    result = verify_audit_chain(db)
    assert result.valid is True
    assert result.reason is None


def test_new_entries_keep_the_chain_valid_after_pruning(db, monkeypatch):
    from app.audit import record_event

    monkeypatch.setattr("app.config.settings.audit_retention_days", 7)
    now, _ = _build_chain(db, old_days=[30, 20, 10, 3, 2, 1])
    prune_audit_logs(db, now=now)

    record_event(db, action="test.after_prune")

    assert verify_audit_chain(db).valid is True


def test_verify_detects_a_tampered_checkpoint(db, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "audit_retention_days", 7)
    now, _ = _build_chain(db, old_days=[30, 20, 10, 3, 2, 1])
    prune_audit_logs(db, now=now)

    checkpoint = db.get(AuditCheckpoint, 1)
    checkpoint.entry_hash = "0" * 64
    db.commit()

    result = verify_audit_chain(db)
    assert result.valid is False
    assert result.reason == "checkpoint"
