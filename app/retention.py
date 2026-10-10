"""Retention/cleanup of expired sessions and old audit entries.

Run periodically (cron, systemd timer, k8s CronJob):

    python -m app.retention

Pruning audit entries moves the chain's genesis forward, so it records a signed
checkpoint (see ``app.checkpoint``) that keeps ``GET /audit/verify`` working.
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.checkpoint import save_checkpoint
from app.config import settings
from app.models import AuditLog, AuthSession


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def prune_expired_sessions(db: Session, *, now: datetime | None = None) -> int:
    """Delete sessions expired or revoked more than ``session_retention_days`` ago."""
    now = now or _utcnow()
    cutoff = now - timedelta(days=settings.session_retention_days)
    stale = [
        session
        for session in db.scalars(select(AuthSession)).all()
        if _as_utc(session.expires_at) < cutoff
        or (
            session.revoked_at is not None
            and _as_utc(session.revoked_at) < cutoff
        )
    ]
    for session in stale:
        db.delete(session)
    db.commit()
    return len(stale)


def prune_audit_logs(db: Session, *, now: datetime | None = None) -> int:
    """Delete audit entries older than ``audit_retention_days`` (0 disables it).

    Records a signed checkpoint at the last pruned entry so the remaining chain
    stays verifiable.
    """
    if settings.audit_retention_days <= 0:
        return 0
    now = now or _utcnow()
    cutoff = now - timedelta(days=settings.audit_retention_days)
    stale = [
        row
        for row in db.scalars(select(AuditLog).order_by(AuditLog.id)).all()
        if _as_utc(row.created_at) < cutoff
    ]
    if not stale:
        return 0
    last_pruned = stale[-1]
    for row in stale:
        db.delete(row)
    db.commit()
    save_checkpoint(db, through_id=last_pruned.id, entry_hash=last_pruned.entry_hash)
    return len(stale)


def run_retention(db: Session, *, now: datetime | None = None) -> dict[str, int]:
    """Prune sessions and audit entries; return the number of rows removed."""
    return {
        "sessions_removed": prune_expired_sessions(db, now=now),
        "audit_removed": prune_audit_logs(db, now=now),
    }


def main() -> None:
    from app.database import SessionLocal

    with SessionLocal() as db:
        removed = run_retention(db)
    print(
        f"removed {removed['sessions_removed']} session(s) "
        f"and {removed['audit_removed']} audit entr(ies)"
    )


if __name__ == "__main__":
    main()
