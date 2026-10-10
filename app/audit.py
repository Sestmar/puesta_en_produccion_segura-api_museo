import hashlib
import hmac
import json
import logging
from dataclasses import dataclass
from datetime import UTC, datetime

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.anchor import AnchorError, anchor_head, read_anchor
from app.checkpoint import CheckpointError, load_checkpoint
from app.client_ip import resolve_client_ip
from app.config import settings
from app.logging_config import request_id_ctx
from app.metrics import record_audit_event
from app.models import AuditLog

logger = logging.getLogger(__name__)


class AuditAction:
    REGISTER = "auth.register"
    LOGIN_SUCCESS = "auth.login.success"
    LOGIN_FAILED = "auth.login.failed"
    LOGIN_LOCKED = "auth.login.locked"
    LOGIN_BLOCKED = "auth.login.blocked"
    PASSWORD_CHANGED = "auth.password.changed"
    REFRESH = "auth.refresh"
    LOGOUT = "auth.logout"
    SESSION_REVOKED = "auth.session.revoked"
    SESSION_REVOKED_ALL = "auth.sessions.revoked_all"
    USER_ROLE_CHANGED = "admin.user.role_changed"
    USER_DEACTIVATED = "admin.user.deactivated"
    USER_ACTIVATED = "admin.user.activated"
    CREATE = "write.create"
    UPDATE = "write.update"
    DELETE = "write.delete"


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _canonical_timestamp(value: datetime) -> str:
    """Normalise a timestamp to a stable UTC ISO string across databases.

    SQLite returns naive datetimes (treated as UTC); PostgreSQL returns aware
    ones. Both must serialise identically so the chain can be re-verified.
    """
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat()


def hash_audit_entry(
    *,
    created_at: datetime,
    action: str,
    actor: str | None,
    resource_type: str | None,
    resource_id: int | None,
    details: dict | None,
    ip_address: str | None,
    user_agent: str | None,
    request_id: str | None,
    prev_hash: str | None,
) -> str:
    """Keyed hash over an entry's content plus the previous entry's hash.

    The chain is HMAC-SHA256 keyed with ``SECRET_KEY``: without the secret an
    attacker who can write to ``audit_logs`` cannot forge a consistent chain.
    """
    payload = {
        "action": action,
        "actor": actor,
        "created_at": _canonical_timestamp(created_at),
        "details": details,
        "ip_address": ip_address,
        "prev_hash": prev_hash,
        "request_id": request_id,
        "resource_id": resource_id,
        "resource_type": resource_type,
        "user_agent": user_agent,
    }
    message = json.dumps(
        payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str
    )
    return hmac.new(
        settings.secret_key.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


@dataclass(frozen=True)
class ChainVerification:
    valid: bool
    checked: int
    first_invalid_id: int | None
    reason: str | None = None


def verify_audit_chain(db: Session) -> ChainVerification:
    """Recompute the chain and report the first entry that breaks it.

    Detects any content change, deletion, insertion or reordering of rows by an
    attacker who can reach the database but lacks ``SECRET_KEY``. When an
    external anchor is configured, the current head is also compared against it,
    which additionally detects truncation of the tail. A signed checkpoint
    (written by retention) lets the chain start from a pruned baseline.
    """
    try:
        checkpoint = load_checkpoint(db)
    except CheckpointError:
        return ChainVerification(False, 0, None, "checkpoint")

    expected_prev: str | None = checkpoint.entry_hash if checkpoint else None
    checked = 0
    for row in db.scalars(select(AuditLog).order_by(AuditLog.id)).all():
        recomputed = hash_audit_entry(
            created_at=row.created_at,
            action=row.action,
            actor=row.actor,
            resource_type=row.resource_type,
            resource_id=row.resource_id,
            details=row.details,
            ip_address=row.ip_address,
            user_agent=row.user_agent,
            request_id=row.request_id,
            prev_hash=expected_prev,
        )
        if row.prev_hash != expected_prev or row.entry_hash != recomputed:
            return ChainVerification(False, checked, row.id, "chain")
        expected_prev = row.entry_hash
        checked += 1

    try:
        anchor = read_anchor()
    except AnchorError:
        return ChainVerification(False, checked, None, "anchor")
    if anchor is None:
        return ChainVerification(True, checked, None, None)

    head = db.scalar(select(AuditLog).order_by(AuditLog.id.desc()).limit(1))
    if head is None or head.id != anchor.id or head.entry_hash != anchor.entry_hash:
        return ChainVerification(False, checked, head.id if head else anchor.id, "anchor")
    return ChainVerification(True, checked, None, None)


def _last_entry_hash(db: Session) -> str | None:
    query = select(AuditLog).order_by(AuditLog.id.desc()).limit(1)
    if db.get_bind().dialect.name != "sqlite":
        query = query.with_for_update()
    last = db.scalar(query)
    return last.entry_hash if last is not None else None


def record_event(
    db: Session,
    *,
    action: str,
    actor: str | None = None,
    resource_type: str | None = None,
    resource_id: int | None = None,
    details: dict | None = None,
    request: Request | None = None,
) -> AuditLog:
    """Persist a tamper-evident audit entry. Never pass credentials."""
    user_agent = None
    ip_address = None
    if request is not None:
        ip_address = resolve_client_ip(request)
        user_agent = request.headers.get("user-agent")
        if user_agent is not None:
            user_agent = user_agent[:255]
    created_at = _utcnow()
    prev_hash = _last_entry_hash(db)
    entry_hash = hash_audit_entry(
        created_at=created_at,
        action=action,
        actor=actor,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
        request_id=request_id_ctx.get(),
        prev_hash=prev_hash,
    )
    entry = AuditLog(
        action=action,
        actor=actor,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
        request_id=request_id_ctx.get(),
        created_at=created_at,
        prev_hash=prev_hash,
        entry_hash=entry_hash,
    )
    db.add(entry)
    db.commit()
    record_audit_event(action)
    try:
        anchor_head(id=entry.id, entry_hash=entry.entry_hash)
    except OSError:
        logger.warning("could not write audit anchor", exc_info=True)
    return entry
