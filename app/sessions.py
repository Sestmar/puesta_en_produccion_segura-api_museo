from datetime import UTC, datetime, timedelta

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.client_ip import resolve_client_ip
from app.config import settings
from app.models import AuthSession, User
from app.security import generate_refresh_token, hash_refresh_token


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _as_utc(value: datetime) -> datetime:
    """SQLite returns naive datetimes; treat them as UTC."""
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def client_info(request: Request) -> tuple[str | None, str | None]:
    ip = resolve_client_ip(request)
    user_agent = request.headers.get("user-agent")
    if user_agent is not None:
        user_agent = user_agent[:255]
    return ip, user_agent


def create_session(
    db: Session, *, user: User, request: Request
) -> tuple[str, AuthSession]:
    """Issue a new refresh token and persist its hash. Returns (raw, model)."""
    raw_token = generate_refresh_token()
    ip, user_agent = client_info(request)
    session = AuthSession(
        user_id=user.id,
        refresh_token_hash=hash_refresh_token(raw_token),
        expires_at=_utcnow() + timedelta(days=settings.refresh_token_expire_days),
        ip_address=ip,
        user_agent=user_agent,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    _enforce_session_cap(db, user.id)
    return raw_token, session


def _enforce_session_cap(db: Session, user_id: int) -> None:
    """Revoke the oldest active sessions beyond ``max_sessions_per_user``."""
    cap = max(1, settings.max_sessions_per_user)
    active = active_sessions_for_user(db, user_id)
    excess = len(active) - cap
    if excess <= 0:
        return
    now = _utcnow()
    for stale in active[:excess]:
        stale.revoked_at = now
    db.commit()


def find_by_token(db: Session, raw_token: str) -> AuthSession | None:
    return db.scalar(
        select(AuthSession).where(
            AuthSession.refresh_token_hash == hash_refresh_token(raw_token)
        )
    )


def is_expired(session: AuthSession) -> bool:
    return _as_utc(session.expires_at) <= _utcnow()


def revoke(db: Session, session: AuthSession) -> None:
    if session.revoked_at is None:
        session.revoked_at = _utcnow()
        db.commit()


def revoke_all_for_user(db: Session, user_id: int) -> None:
    now = _utcnow()
    sessions = db.scalars(
        select(AuthSession).where(
            AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None)
        )
    ).all()
    for session in sessions:
        session.revoked_at = now
    db.commit()


def active_sessions_for_user(db: Session, user_id: int) -> list[AuthSession]:
    sessions = db.scalars(
        select(AuthSession)
        .where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
        .order_by(AuthSession.id)
    ).all()
    return [session for session in sessions if not is_expired(session)]
