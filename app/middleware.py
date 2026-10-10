import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, RedirectResponse

from app.client_ip import resolve_client_ip
from app.config import settings
from app.logging_config import request_id_ctx

access_logger = logging.getLogger("app.access")

DOCS_PATHS = frozenset({"/docs", "/redoc", "/openapi.json"})


class ProductionDocsMiddleware(BaseHTTPMiddleware):
    """Hide the interactive docs and the OpenAPI schema in production."""

    async def dispatch(self, request: Request, call_next):
        if settings.environment == "production" and request.url.path in DOCS_PATHS:
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        return await call_next(request)


class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """Redirect plain HTTP to HTTPS when ``FORCE_HTTPS`` is enabled.

    Behind a TLS-terminating proxy the original scheme arrives in
    ``X-Forwarded-Proto``; honouring it avoids redirect loops. Spoofing that
    header only lets a client skip a usability redirect, never bypass real TLS.
    """

    async def dispatch(self, request: Request, call_next):
        if settings.force_https:
            proto = request.headers.get("x-forwarded-proto", request.url.scheme)
            if proto.split(",")[0].strip().lower() != "https":
                url = request.url.replace(scheme="https")
                return RedirectResponse(url=str(url), status_code=307)
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        if settings.content_security_policy:
            response.headers.setdefault(
                "Content-Security-Policy", settings.content_security_policy
            )
        if settings.environment == "production":
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        return response


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Bind a request id to the context and emit a structured access log."""

    async def dispatch(self, request: Request, call_next):
        incoming = request.headers.get("X-Request-ID")
        request_id = incoming.strip() if incoming else str(uuid.uuid4())
        token = request_id_ctx.set(request_id)
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            self._log(request, request_id, 500, start, failed=True)
            request_id_ctx.reset(token)
            raise
        response.headers["X-Request-ID"] = request_id
        self._log(request, request_id, response.status_code, start)
        request_id_ctx.reset(token)
        return response

    @staticmethod
    def _log(
        request: Request,
        request_id: str,
        status_code: int,
        start: float,
        *,
        failed: bool = False,
    ) -> None:
        fields = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": status_code,
            "duration_ms": round((time.perf_counter() - start) * 1000, 2),
            "client_ip": resolve_client_ip(request),
        }
        log = access_logger.error if failed else access_logger.info
        log("request failed" if failed else "request completed", extra={"fields": fields})
