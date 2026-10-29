"""Google OAuth 2.0 (authorization code) helpers.

The flow is stateless on the server: the ``state`` parameter is a nonce plus a
timestamp signed with ``SECRET_KEY`` (HMAC-SHA256), so no extra table is needed.
The same value is stored in a short-lived httpOnly cookie and must match on the
callback, which binds the flow to the browser that started it (login CSRF
protection). Identity is resolved from Google's userinfo
endpoint, which is queried server-to-server over TLS with the access token just
exchanged for the authorization code.
"""

import hashlib
import hmac
import re
import secrets
import time
from typing import Any

import httpx
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Role, User

AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo"
SCOPES = "openid email profile"
STATE_MAX_AGE_SECONDS = 600
HTTP_TIMEOUT_SECONDS = 10
PROVIDER = "google"

_USERNAME_ALLOWED = re.compile(r"[^a-zA-Z0-9_.-]")


class OAuthError(Exception):
    """Raised when Google rejects the exchange or returns unusable data."""


def google_configured() -> bool:
    return bool(settings.google_client_id and settings.google_client_secret)


def _sign(payload: str) -> str:
    return hmac.new(
        settings.secret_key.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def create_state() -> str:
    """Return ``nonce.timestamp.signature``, verifiable without server state."""
    payload = f"{secrets.token_urlsafe(24)}.{int(time.time())}"
    return f"{payload}.{_sign(payload)}"


def verify_state(state: str) -> bool:
    parts = state.split(".")
    if len(parts) != 3:
        return False
    nonce, issued_at, signature = parts
    payload = f"{nonce}.{issued_at}"
    if not hmac.compare_digest(signature, _sign(payload)):
        return False
    try:
        timestamp = int(issued_at)
    except ValueError:
        return False
    return 0 <= time.time() - timestamp <= STATE_MAX_AGE_SECONDS


def state_matches(state: str, cookie_state: str | None) -> bool:
    return cookie_state is not None and hmac.compare_digest(state, cookie_state)


def build_authorization_url(state: str) -> str:
    params = {
        "client_id": settings.google_client_id or "",
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": SCOPES,
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"{AUTHORIZATION_ENDPOINT}?{httpx.QueryParams(params)}"


def exchange_code(code: str) -> str:
    """Trade the authorization code for an access token."""
    try:
        response = httpx.post(
            TOKEN_ENDPOINT,
            data={
                "code": code,
                "client_id": settings.google_client_id or "",
                "client_secret": settings.google_client_secret or "",
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=HTTP_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as exc:
        raise OAuthError("token exchange failed") from exc
    if response.status_code != 200:
        raise OAuthError("token exchange rejected")
    access_token = response.json().get("access_token")
    if not isinstance(access_token, str) or not access_token:
        raise OAuthError("missing access token")
    return access_token


def fetch_userinfo(access_token: str) -> dict[str, Any]:
    """Return Google's verified identity for the access token."""
    try:
        response = httpx.get(
            USERINFO_ENDPOINT,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=HTTP_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as exc:
        raise OAuthError("userinfo request failed") from exc
    if response.status_code != 200:
        raise OAuthError("userinfo rejected")
    data = response.json()
    subject = data.get("sub")
    email = data.get("email")
    if not isinstance(subject, str) or not subject:
        raise OAuthError("missing subject")
    if not isinstance(email, str) or not email:
        raise OAuthError("missing email")
    if data.get("email_verified") is not True:
        raise OAuthError("email not verified")
    return {"sub": subject, "email": email}


def _username_from_email(db: Session, email: str) -> str:
    local = email.split("@", 1)[0]
    base = _USERNAME_ALLOWED.sub("-", local).strip(".-_") or "user"
    base = base[:40]
    if len(base) < 3:
        base = f"{base}-user"
    candidate = base
    suffix = 1
    while db.scalar(select(User).where(User.username == candidate)) is not None:
        suffix += 1
        tail = f"-{suffix}"
        candidate = f"{base[: 50 - len(tail)]}{tail}"
    return candidate


def find_or_create_user(
    db: Session, *, subject: str, email: str
) -> tuple[User, bool]:
    """Return ``(user, created)`` for a Google identity.

    Existing identities are matched by ``(provider, subject)`` only; there is no
    automatic account linking by email, which would let someone take over a local
    account. The very first account of the installation becomes admin, matching
    the bootstrap rule of ``/auth/register``.
    """
    user = db.scalar(
        select(User).where(
            User.oauth_provider == PROVIDER, User.oauth_subject == subject
        )
    )
    if user is not None:
        return user, False

    is_first_user = (db.scalar(select(func.count()).select_from(User)) or 0) == 0
    user = User(
        username=_username_from_email(db, email),
        hashed_password=None,
        email=email,
        oauth_provider=PROVIDER,
        oauth_subject=subject,
        role=Role.ADMIN.value if is_first_user else Role.CLIENT.value,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise OAuthError("could not create user") from exc
    db.refresh(user)
    return user, True
