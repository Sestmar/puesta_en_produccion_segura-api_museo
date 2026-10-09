from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import Base, engine
from app.middleware import SecurityHeadersMiddleware
from app.ratelimit import limiter
from app.routers import artworks, artists, auth, rooms


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.environment == "production":
        if settings.secret_key == "insecure-dev-secret-change-me":
            raise RuntimeError(
                "SECRET_KEY must be set to a custom value in production"
            )
        if len(settings.secret_key.encode("utf-8")) < 32:
            raise RuntimeError("SECRET_KEY must be at least 32 bytes in production")
    Base.metadata.create_all(bind=engine)
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
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth.router)
app.include_router(artists.router)
app.include_router(rooms.router)
app.include_router(artworks.router)


@app.get("/health", tags=["system"])
def health_check():
    return {"status": "ok"}
