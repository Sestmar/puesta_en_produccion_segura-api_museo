from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit import AuditAction, record_event
from app.database import get_db
from app.deps import require_admin
from app.models import User
from app.schemas import UserOut, UserUpdate
from app.sessions import revoke_all_for_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    current_user: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    statement = select(User).order_by(User.id).offset(skip).limit(limit)
    return db.scalars(statement).all()


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    current_user: Annotated[User, Depends(require_admin)],
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role or active status",
        )
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    changes = payload.model_dump(exclude_unset=True, exclude_none=True)

    if "role" in changes and changes["role"] != target.role:
        previous_role = target.role
        target.role = changes["role"]
        db.commit()
        record_event(
            db,
            action=AuditAction.USER_ROLE_CHANGED,
            actor=current_user.username,
            resource_type="user",
            resource_id=target.id,
            details={"from": previous_role, "to": target.role},
            request=request,
        )

    if "is_active" in changes and changes["is_active"] != target.is_active:
        target.is_active = changes["is_active"]
        if target.is_active:
            db.commit()
            record_event(
                db,
                action=AuditAction.USER_ACTIVATED,
                actor=current_user.username,
                resource_type="user",
                resource_id=target.id,
                details={"username": target.username},
                request=request,
            )
        else:
            # Disabling an account must kill its active sessions immediately.
            revoke_all_for_user(db, target.id)
            record_event(
                db,
                action=AuditAction.USER_DEACTIVATED,
                actor=current_user.username,
                resource_type="user",
                resource_id=target.id,
                details={"username": target.username},
                request=request,
            )

    db.refresh(target)
    return target
