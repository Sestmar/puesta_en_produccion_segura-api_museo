from starlette.requests import Request

from app.config import settings


def resolve_client_ip(request: Request) -> str | None:
    """Resolve the real client IP, honouring trusted reverse proxies.

    ``request.client.host`` is the direct peer. Behind a reverse proxy that is
    the proxy's address, so ``X-Forwarded-For`` is only trusted when the direct
    peer is in ``settings.trusted_proxies``; otherwise a client could spoof the
    header. Returns ``None`` when the client cannot be determined.
    """
    direct = request.client.host if request.client else None
    trusted = settings.trusted_proxies
    if direct and trusted and direct in trusted:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            hops = [hop.strip() for hop in forwarded.split(",") if hop.strip()]
            for hop in reversed(hops):
                if hop not in trusted:
                    return hop
            if hops:
                return hops[0]
    return direct


def client_ip(request: Request) -> str:
    """Like ``resolve_client_ip`` but with a stable fallback for rate limiting."""
    return resolve_client_ip(request) or "127.0.0.1"
