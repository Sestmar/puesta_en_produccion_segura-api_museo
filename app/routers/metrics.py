from fastapi import APIRouter, HTTPException, Request, status
from starlette.responses import Response

from app.client_ip import is_in_networks
from app.config import settings
from app.metrics import METRICS_MEDIA_TYPE, render_metrics
from app.ratelimit import limiter

router = APIRouter(tags=["system"])

_PROXY_HEADERS = ("x-forwarded-for", "x-real-ip", "forwarded")


def metrics_access_allowed(request: Request) -> bool:
    """Allow scrapers on the internal network, never traffic from the internet.

    The public reverse proxy always adds forwarding headers, so any request that
    carries them came from outside and is refused, whatever its peer address.
    """
    allowed = settings.metrics_allowed_networks
    if not allowed:
        return True
    if any(header in request.headers for header in _PROXY_HEADERS):
        return False
    peer = request.client.host if request.client else None
    return peer is not None and is_in_networks(peer, allowed)


@router.get("/metrics", response_class=Response)
@limiter.exempt
def metrics(request: Request):
    """Prometheus metrics in text exposition format."""
    if not metrics_access_allowed(request):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
    return Response(content=render_metrics(), media_type=METRICS_MEDIA_TYPE)
