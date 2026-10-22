"""Google sign-in (OAuth 2.0 authorization code flow).

``GET /auth/google/login`` redirects the browser to Google's consent screen;
``GET /auth/google/callback`` receives the authorization code, resolves the
Google identity and opens a normal server-side session. The refresh token is
delivered in the same httpOnly cookie as ``/auth/login``, so the SPA only has to
call ``/auth/refresh`` after being redirected back.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.audit import AuditAction, record_event
from app.config import settings
from app.cookies import set_refresh_cookie
from app.database import get_db
from app.oauth import (
    OAuthError,
    build_authorization_url,
    create_state,
    exchange_code,
    fetch_userinfo,
    find_or_create_user,
    google_configured,
    verify_state,
)
from app.ratelimit import limiter
from app.sessions import create_session

router = APIRouter(prefix="/auth/google", tags=["authentication"])


def _not_configured() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Google sign-in is not configured",
    )


def _frontend_redirect(outcome: str) -> RedirectResponse:
    base = settings.frontend_url.rstrip("/")
    return RedirectResponse(
        f"{base}/login?oauth={outcome}", status_code=status.HTTP_303_SEE_OTHER
    )


@router.get("/login")
@limiter.limit(lambda: settings.oauth_rate_limit)
def google_login(request: Request):
    if not google_configured():
        raise _not_configured()
    return RedirectResponse(build_authorization_url(create_state()))


@router.get("/callback")
@limiter.limit(lambda: settings.oauth_rate_limit)
def google_callback(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
):
    if not google_configured():
        raise _not_configured()
    if error is not None or not code or not state:
        return _frontend_redirect("error")
    if not verify_state(state):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state",
        )
    try:
        access_token = exchange_code(code)
        identity = fetch_userinfo(access_token)
        user, created = find_or_create_user(
            db, subject=identity["sub"], email=identity["email"]
        )
    except OAuthError:
        return _frontend_redirect("error")

    if not user.is_active:
        record_event(
            db,
            action=AuditAction.LOGIN_BLOCKED,
            actor=user.username,
            details={"username": user.username, "provider": "google"},
            request=request,
        )
        return _frontend_redirect("error")

    record_event(
        db,
        action=AuditAction.OAUTH_SIGNUP if created else AuditAction.OAUTH_LOGIN,
        actor=user.username,
        resource_type="user",
        resource_id=user.id,
        details={"username": user.username, "role": user.role, "provider": "google"},
        request=request,
    )
    refresh_token, _session = create_session(db, user=user, request=request)
    response = _frontend_redirect("success")
    set_refresh_cookie(response, refresh_token)
    return response
