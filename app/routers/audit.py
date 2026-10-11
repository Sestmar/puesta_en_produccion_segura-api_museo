from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.audit import verify_audit_chain
from app.database import get_db
from app.deps import require_admin
from app.models import AuditLog, User
from app.schemas import AuditChainVerificationOut, AuditLogOut, PageResult

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=PageResult[AuditLogOut])
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
    count_statement = select(func.count()).select_from(AuditLog)
    if action is not None:
        statement = statement.where(AuditLog.action == action)
        count_statement = count_statement.where(AuditLog.action == action)
    if actor is not None:
        statement = statement.where(AuditLog.actor == actor)
        count_statement = count_statement.where(AuditLog.actor == actor)
    if request_id is not None:
        statement = statement.where(AuditLog.request_id == request_id)
        count_statement = count_statement.where(AuditLog.request_id == request_id)
    total = db.scalar(count_statement) or 0
    items = db.scalars(statement.offset(skip).limit(limit)).all()
    return {"items": items, "total": total, "skip": skip, "limit": limit}


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
