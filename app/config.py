from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Museum API"
    environment: str = "development"
    secret_key: str = "insecure-dev-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    database_url: str = "sqlite:///./museo.db"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    login_rate_limit: str = "5 per minute"
    bcrypt_rounds: int = 12


settings = Settings()
