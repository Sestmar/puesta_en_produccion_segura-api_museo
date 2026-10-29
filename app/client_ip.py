import ipaddress
from collections.abc import Iterable

from starlette.requests import Request

from app.config import settings


def is_in_networks(host: str, entries: Iterable[str]) -> bool:
    """True if ``host`` equals an entry or falls inside one given in CIDR form.

    CIDR matters behind container orchestrators: the proxy's address changes when
    it is recreated, but it stays inside the network's subnet.
    """
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        address = None
    for entry in entries:
        if host == entry:
            return True
        if address is None:
            continue
        try:
            if address in ipaddress.ip_network(entry, strict=False):
                return True
        except ValueError:
            continue
    return False


def resolve_client_ip(request: Request) -> str | None:
    """Resolve the real client IP, honouring trusted reverse proxies.

    ``request.client.host`` is the direct peer. Behind a reverse proxy that is
    the proxy's address, so ``X-Forwarded-For`` is only trusted when the direct
    peer is in ``settings.trusted_proxies`` (IPs or CIDR ranges); otherwise a
    client could spoof the header. Returns ``None`` when the client cannot be
    determined.
    """
    direct = request.client.host if request.client else None
    trusted = settings.trusted_proxies
    if direct and trusted and is_in_networks(direct, trusted):
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            hops = [hop.strip() for hop in forwarded.split(",") if hop.strip()]
            for hop in reversed(hops):
                if not is_in_networks(hop, trusted):
                    return hop
            if hops:
                return hops[0]
    return direct


def client_ip(request: Request) -> str:
    """Like ``resolve_client_ip`` but with a stable fallback for rate limiting."""
    return resolve_client_ip(request) or "127.0.0.1"
