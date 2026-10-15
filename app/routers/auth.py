from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.audit import AuditAction, record_event
from app.config import settings
from app.cookies import clear_refresh_cookie, get_refresh_cookie, set_refresh_cookie
from app.database import get_db
from app.deps import get_current_user, require_admin_or_bootstrap
from app.models import AuthSession, Role, User
from app.ratelimit import limiter
from app.schemas import (
    PasswordChange,
    SessionOut,
    SignupCreate,
    TokenOut,
    UserCreate,
    UserOut,
)
from app.security import create_access_token, hash_password, verify_password
from app.sessions import (
    _as_utc,
    _utcnow,
    active_sessions_for_user,
    create_session,
    find_by_token,
    is_expired,
    revoke,
    revoke_all_for_user,
)

router = APIRouter(prefix="/auth", tags=["authentication"])

# Verified against when the username does not exist, so response time does not
# reveal whether an account is registered (timing-based user enumeration).
DUMMY_HASH = hash_password("dummy-password-0000")


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=UserOut,
)
def register(
    payload: UserCreate,
    db: Annotated[Session, Depends(get_db)],
    auth_user: Annotated[User | None, Depends(require_admin_or_bootstrap)],
    request: Request,
):
    role = Role.ADMIN.value if auth_user is None else payload.role
    user = _create_user(db, username=payload.username, password=payload.password, role=role)
    record_event(
        db,
        action=AuditAction.REGISTER,
        actor=user.username,
        resource_type="user",
        resource_id=user.id,
        request=request,
    )
    return user


@router.post(
    "/signup",
    status_code=status.HTTP_201_CREATED,
    response_model=UserOut,
)
@limiter.limit(lambda: settings.signup_rate_limit)
def signup(
    payload: SignupCreate,
    db: Annotated[Session, Depends(get_db)],
    request: Request,
):
    """Public self-registration. Always creates a client account."""
    # Signing up first would consume the empty-table bootstrap of the admin.
    if (db.scalar(select(func.count()).select_from(User)) or 0) == 0:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Registration is not available yet",
        )
    user = _create_user(
        db,
        username=payload.username,
        password=payload.password,
        role=Role.CLIENT.value,
    )
    record_event(
        db,
        action=AuditAction.SIGNUP,
        actor=user.username,
        resource_type="user",
        resource_id=user.id,
        request=request,
    )
    return user


def _create_user(db: Session, *, username: str, password: str, role: str) -> User:
    username_taken = HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Username is already taken",
    )
    if db.scalar(select(User).where(User.username == username)) is not None:
        raise username_taken
    user = User(username=username, hashed_password=hash_password(password), role=role)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise username_taken from None
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
@limiter.limit(lambda: settings.login_rate_limit)
def login(
    request: Request,
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
):
    user = db.scalar(select(User).where(User.username == form_data.username))
    if (
        user is not None
        and user.locked_until is not None
        and _as_utc(user.locked_until) > _utcnow()
    ):
        record_event(
            db,
            action=AuditAction.LOGIN_LOCKED,
            actor=user.username,
            details={"username": user.username},
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    stored_hash = user.hashed_password if user is not None else DUMMY_HASH
    password_ok = verify_password(form_data.password, stored_hash)
    if user is None or not password_ok:
        if user is not None:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= settings.max_failed_attempts:
                user.locked_until = _utcnow() + timedelta(
                    minutes=settings.lockout_minutes
                )
            db.commit()
            record_event(
                db,
                action=AuditAction.LOGIN_FAILED,
                actor=user.username,
                details={"username": user.username},
                request=request,
            )
            if user.locked_until is not None:
                record_event(
                    db,
                    action=AuditAction.LOGIN_LOCKED,
                    actor=user.username,
                    details={"username": user.username},
                    request=request,
                )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        record_event(
            db,
            action=AuditAction.LOGIN_BLOCKED,
            actor=user.username,
            details={"username": user.username},
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.failed_login_attempts != 0 or user.locked_until is not None:
        user.failed_login_attempts = 0
        user.locked_until = None
        db.commit()
    record_event(
        db,
        action=AuditAction.LOGIN_SUCCESS,
        actor=user.username,
        resource_type="user",
        resource_id=user.id,
        details={"username": user.username, "role": user.role},
        request=request,
    )
    refresh_token, session = create_session(db, user=user, request=request)
    access_token = create_access_token(
        subject=user.username, role=user.role, session_id=session.id
    )
    set_refresh_cookie(response, refresh_token)
    return {"access_token": access_token, "token_type": "bearer"}


def _invalid_refresh(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.post("/refresh", response_model=TokenOut)
@limiter.limit(lambda: settings.refresh_rate_limit)
def refresh(
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
):
    raw_token = get_refresh_cookie(request)
    if raw_token is None:
        raise _invalid_refresh("Invalid refresh token")

    session = find_by_token(db, raw_token)
    if session is None:
        raise _invalid_refresh("Invalid refresh token")
    if session.revoked_at is not None:
        revoke_all_for_user(db, session.user_id)
        raise _invalid_refresh("Refresh token has been revoked")
    if is_expired(session):
        raise _invalid_refresh("Refresh token has expired")

    user = session.user
    revoke(db, session)
    new_refresh, new_session = create_session(db, user=user, request=request)
    access_token = create_access_token(
        subject=user.username, role=user.role, session_id=new_session.id
    )
    set_refresh_cookie(response, new_refresh)
    record_event(
        db,
        action=AuditAction.REFRESH,
        actor=user.username,
        resource_type="user",
        resource_id=user.id,
        details={"username": user.username},
        request=request,
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
):
    raw_token = get_refresh_cookie(request)
    if raw_token is not None:
        session = find_by_token(db, raw_token)
        if session is not None:
            revoke(db, session)
    clear_refresh_cookie(response)
    record_event(
        db,
        action=AuditAction.LOGOUT,
        actor=session.user.username if session is not None else None,
        request=request,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: PasswordChange,
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if payload.new_password == payload.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must differ from the current one",
        )
    current_user.hashed_password = hash_password(payload.new_password)
    revoke_all_for_user(db, current_user.id)
    clear_refresh_cookie(response)
    record_event(
        db,
        action=AuditAction.PASSWORD_CHANGED,
        actor=current_user.username,
        resource_type="user",
        resource_id=current_user.id,
        request=request,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/sessions", status_code=status.HTTP_204_NO_CONTENT)
def revoke_all_sessions(
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
):
    revoke_all_for_user(db, current_user.id)
    clear_refresh_cookie(response)
    record_event(
        db,
        action=AuditAction.SESSION_REVOKED_ALL,
        actor=current_user.username,
        resource_type="user",
        resource_id=current_user.id,
        request=request,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return active_sessions_for_user(db, current_user.id)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_session(
    session_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    session = db.get(AuthSession, session_id)
    if session is None or session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )
    revoke(db, session)
    record_event(
        db,
        action=AuditAction.SESSION_REVOKED,
        actor=current_user.username,
        resource_type="auth_session",
        resource_id=session_id,
        request=request,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user
