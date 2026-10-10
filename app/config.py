from pydantic_settings import BaseSettings, SettingsConfigDict

# Known placeholder secrets shipped in dev config, examples and docker-compose.
# These must never be accepted when running in production.
INSECURE_SECRET_KEYS = frozenset(
    {
        "insecure-dev-secret-change-me",
        "change-me-generate-a-long-random-string",
        "dev-only-secret-change-me-please-32-bytes",
    }
)


def validate_secret_key(secret_key: str, environment: str) -> None:
    """Reject obviously insecure secrets when running in production."""
    if environment != "production":
        return
    if secret_key in INSECURE_SECRET_KEYS:
        raise RuntimeError("SECRET_KEY must be set to a custom value in production")
    if len(secret_key.encode("utf-8")) < 32:
        raise RuntimeError("SECRET_KEY must be at least 32 bytes in production")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Museum API"
    environment: str = "development"
    secret_key: str = "insecure-dev-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14
    database_url: str = "sqlite:///./museo.db"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    login_rate_limit: str = "5 per minute"
    refresh_rate_limit: str = "20 per minute"
    default_rate_limit: str = "100 per minute"
    max_failed_attempts: int = 5
    lockout_minutes: int = 15
    max_sessions_per_user: int = 10
    session_retention_days: int = 7
    audit_retention_days: int = 0
    force_https: bool = False
    content_security_policy: str = (
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    )
    bcrypt_rounds: int = 12
    log_level: str = "INFO"
    ratelimit_storage_uri: str | None = None
    trusted_proxies: list[str] = []
    audit_anchor_path: str | None = None


settings = Settings()
