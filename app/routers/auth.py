from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user, require_admin_or_bootstrap
from app.models import Role, User
from app.ratelimit import limiter
from app.schemas import TokenOut, UserCreate, UserOut
from app.security import create_access_token, hash_password, verify_password

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
):
    existing = db.scalar(select(User).where(User.username == payload.username))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already taken",
        )
    role = Role.ADMIN.value if auth_user is None else payload.role
    user = User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role=role,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already taken",
        )
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
@limiter.limit(lambda: settings.login_rate_limit)
def login(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
):
    user = db.scalar(select(User).where(User.username == form_data.username))
    stored_hash = user.hashed_password if user is not None else DUMMY_HASH
    password_ok = verify_password(form_data.password, stored_hash)
    if user is None or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(subject=user.username, role=user.role)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user
