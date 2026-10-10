from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import AuthSession, Role, User
from app.sessions import is_expired

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def user_from_token(token: str, db: Session) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
    except jwt.PyJWTError:
        raise credentials_error from None
    username = payload.get("sub")
    session_id = payload.get("sid")
    if not isinstance(username, str) or not isinstance(session_id, int):
        raise credentials_error
    session = db.get(AuthSession, session_id)
    if session is None or session.revoked_at is not None or is_expired(session):
        raise credentials_error
    user = session.user
    if user is None or user.username != username:
        raise credentials_error
    if not user.is_active:
        raise credentials_error
    return user


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    return user_from_token(token, db)


def require_role(*roles: str):
    def dependency(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return dependency


require_admin = require_role(Role.ADMIN.value)


def require_admin_or_bootstrap(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> User | None:
    """Empty users table allows bootstrap registration; otherwise admin only."""
    user_count = db.scalar(select(func.count()).select_from(User)) or 0
    if user_count == 0:
        return None
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = user_from_token(authorization.removeprefix("Bearer ").strip(), db)
    if user.role != Role.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )
    return user
