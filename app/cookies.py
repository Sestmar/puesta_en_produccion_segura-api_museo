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


def set_refresh_cookie(response: Response, token: str) -> None:
    """Set the httpOnly refresh-token cookie with the rotated value."""
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite=_parse_samesite(settings.refresh_cookie_samesite),
        max_age=int(settings.refresh_token_expire_days * 24 * 60 * 60),
        path="/",
    )


def clear_refresh_cookie(response: Response) -> None:
    """Expire the refresh-token cookie immediately."""
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/",
    )


def get_refresh_cookie(request: Request) -> str | None:
    """Read the raw refresh token from the request cookie, if present."""
    return request.cookies.get(REFRESH_COOKIE_NAME)
