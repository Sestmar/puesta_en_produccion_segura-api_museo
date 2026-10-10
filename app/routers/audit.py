from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit import verify_audit_chain
from app.database import get_db
from app.deps import require_admin
from app.models import AuditLog, User
from app.schemas import AuditChainVerificationOut, AuditLogOut

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditLogOut])
def list_audit(
    current_user: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
    action: Annotated[str | None, Query(max_length=50)] = None,
    actor: Annotated[str | None, Query(max_length=50)] = None,
    request_id: Annotated[str | None, Query(max_length=100)] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    """List audit entries (newest first) with optional filters."""
    statement = select(AuditLog).order_by(AuditLog.id.desc())
    if action is not None:
        statement = statement.where(AuditLog.action == action)
    if actor is not None:
        statement = statement.where(AuditLog.actor == actor)
    if request_id is not None:
        statement = statement.where(AuditLog.request_id == request_id)
    return db.scalars(statement.offset(skip).limit(limit)).all()


@router.get("/verify", response_model=AuditChainVerificationOut)
def verify_chain(
    current_user: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> AuditChainVerificationOut:
    """Recompute the audit hash chain and report the first tampered entry."""
    result = verify_audit_chain(db)
    return AuditChainVerificationOut(
        valid=result.valid,
        checked=result.checked,
        first_invalid_id=result.first_invalid_id,
        reason=result.reason,
    )
