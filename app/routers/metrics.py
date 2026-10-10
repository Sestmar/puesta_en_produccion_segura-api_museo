from fastapi import APIRouter
from starlette.responses import Response

from app.metrics import METRICS_MEDIA_TYPE, render_metrics
from app.ratelimit import limiter

router = APIRouter(tags=["system"])


@router.get("/metrics", response_class=Response)
@limiter.exempt
def metrics():
    """Prometheus metrics in text exposition format."""
    return Response(content=render_metrics(), media_type=METRICS_MEDIA_TYPE)
