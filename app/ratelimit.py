from fastapi.routing import _IncludedRouter
from slowapi import Limiter
from slowapi.middleware import _should_exempt, sync_check_limits
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.routing import Match

from app.client_ip import client_ip
from app.config import settings


def build_limiter(*, storage_uri: str | None, default_limit):
    return Limiter(
        key_func=client_ip,
        default_limits=[default_limit],
        storage_uri=storage_uri or "memory://",
    )


limiter = build_limiter(
    storage_uri=settings.ratelimit_storage_uri,
    default_limit=lambda: settings.default_rate_limit,
)


def _find_route_handler(routes, scope):
    """Resolve the route handler for a request scope.

    slowapi's own ``_find_route_handler`` only checks ``hasattr(route, "endpoint")``
    which fails on FastAPI >= 0.142 because ``include_router`` wraps routes in
    ``_IncludedRouter`` objects (a ``BaseRoute`` subclass without ``.endpoint``).
    This replacement descends into ``_IncludedRouter._match()`` to find the
    underlying ``APIRoute`` endpoint.
    """
    handler = None
    for route in routes:
        if isinstance(route, _IncludedRouter):
            match, _child_scope, matched_route, _ctx = route._match(scope)
            if (
                match == Match.FULL
                and matched_route is not None
                and hasattr(matched_route, "endpoint")
            ):
                handler = matched_route.endpoint
        else:
            match, _child_scope = route.matches(scope)
            if match == Match.FULL and hasattr(route, "endpoint"):
                handler = route.endpoint
    return handler


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Drop-in replacement for slowapi's ``SlowAPIMiddleware``.

    Identical behaviour except that it uses the fixed ``_find_route_handler``
    above so that default limits actually reach routes registered via
    ``include_router``.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        app = request.app
        if not limiter.enabled:
            return await call_next(request)

        handler = _find_route_handler(app.routes, request.scope)
        if _should_exempt(limiter, handler):
            return await call_next(request)

        error_response, should_inject_headers = sync_check_limits(
            limiter, request, handler, app
        )
        if error_response is not None:
            return error_response

        response = await call_next(request)
        if should_inject_headers:
            response = limiter._inject_headers(
                response, request.state.view_rate_limit
            )
        return response
