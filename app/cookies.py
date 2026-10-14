"""Cookie helpers for the httpOnly refresh token."""

from fastapi import Request, Response

from app.config import settings

REFRESH_COOKIE_NAME = settings.refresh_cookie_name


def set_refresh_cookie(response: Response, token: str) -> None:
    """Set the httpOnly refresh-token cookie with the rotated value."""
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite=settings.refresh_cookie_samesite.lower(),
        max_age=int(settings.refresh_token_expire_days * 24 * 60 * 60),
        path="/auth",
    )


def clear_refresh_cookie(response: Response) -> None:
    """Expire the refresh-token cookie immediately."""
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/auth",
    )


def get_refresh_cookie(request: Request) -> str | None:
    """Read the raw refresh token from the request cookie, if present."""
    return request.cookies.get(REFRESH_COOKIE_NAME)
