"""Cookie helpers for the httpOnly refresh token."""

from typing import Literal

from fastapi import Request, Response

from app.config import settings

REFRESH_COOKIE_NAME = settings.refresh_cookie_name
SameSitePolicy = Literal["lax", "strict", "none"]


def _parse_samesite(value: str) -> SameSitePolicy:
    normalized = value.lower()
    if normalized in ("lax", "strict", "none"):
        return normalized  # type: ignore[return-value]
    raise ValueError(f"Invalid SameSite cookie policy: {value!r}")


REFRESH_COOKIE_PATH = "/auth"
# A release briefly scoped the cookie to "/". Browsers would keep sending that
# stale copy next to the current one, so it is expired whenever the cookie is set
# or cleared.
_LEGACY_REFRESH_COOKIE_PATH = "/"

OAUTH_STATE_COOKIE_NAME = "oauth_state"
OAUTH_STATE_COOKIE_PATH = "/auth/google"


def set_refresh_cookie(response: Response, token: str) -> None:
    """Set the httpOnly refresh-token cookie with the rotated value."""
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path=_LEGACY_REFRESH_COOKIE_PATH)
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite=_parse_samesite(settings.refresh_cookie_samesite),
        max_age=int(settings.refresh_token_expire_days * 24 * 60 * 60),
        path=REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response: Response) -> None:
    """Expire the refresh-token cookie immediately."""
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path=_LEGACY_REFRESH_COOKIE_PATH)
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)


def set_oauth_state_cookie(response: Response, state: str, max_age: int) -> None:
    """Bind an OAuth ``state`` to the browser that started the flow.

    ``SameSite=Lax`` is required: Google returns with a top-level cross-site GET.
    """
    response.set_cookie(
        key=OAUTH_STATE_COOKIE_NAME,
        value=state,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite="lax",
        max_age=max_age,
        path=OAUTH_STATE_COOKIE_PATH,
    )


def clear_oauth_state_cookie(response: Response) -> None:
    response.delete_cookie(key=OAUTH_STATE_COOKIE_NAME, path=OAUTH_STATE_COOKIE_PATH)


def get_refresh_cookie(request: Request) -> str | None:
    """Read the raw refresh token from the request cookie, if present."""
    return request.cookies.get(REFRESH_COOKIE_NAME)
