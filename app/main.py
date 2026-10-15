from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings, validate_secret_key
from app.logging_config import configure_logging
from app.middleware import (
    HTTPSRedirectMiddleware,
    ProductionDocsMiddleware,
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
)
from app.ratelimit import RateLimitMiddleware, limiter
from app.routers import (
    artists,
    artworks,
    audit,
    auth,
    favorites,
    health,
    metrics,
    rooms,
    users,
)

configure_logging(settings.log_level)


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_secret_key(settings.secret_key, settings.environment)
    yield


app = FastAPI(
    title=settings.app_name,
    description=(
        "REST API for a museum catalog with JWT authentication, "
        "role-based access control and rate limiting."
    ),
    version="1.0.0",
    debug=False,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_middleware(HTTPSRedirectMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(ProductionDocsMiddleware)

app.include_router(health.router)
app.include_router(metrics.router)
app.include_router(auth.router)
app.include_router(audit.router)
app.include_router(users.router)
app.include_router(artists.router)
app.include_router(rooms.router)
app.include_router(artworks.router)
app.include_router(favorites.router)
