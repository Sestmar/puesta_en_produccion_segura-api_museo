"""Configuración de las pruebas E2E leída de variables de entorno.

El mismo código se ejecuta contra el entorno local (docker compose) y contra
producción (VPS con Dokploy); solo cambian estas variables.
"""

import os
from dataclasses import dataclass
from pathlib import Path


def _flag(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "si", "sí"}


@dataclass(frozen=True)
class E2EConfig:
    target: str
    base_url: str
    api_url: str
    admin_user: str | None
    admin_password: str | None
    client_user: str | None
    client_password: str | None
    allow_writes: bool
    allow_signup: bool
    expect_production: bool
    headless: bool

    @property
    def is_https(self) -> bool:
        return self.base_url.startswith("https://")


def load_env_file(target: str) -> None:
    """Carga ``tests_e2e/.env.<target>`` sin pisar variables ya definidas.

    Esos ficheros guardan credenciales de prueba y están en .gitignore.
    """
    path = Path(__file__).parent / f".env.{target}"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def load_config() -> E2EConfig:
    target = os.environ.get("E2E_TARGET", "local").strip().lower()
    load_env_file(target)
    is_prod = target == "prod"
    return E2EConfig(
        target=target,
        base_url=os.environ.get("E2E_BASE_URL", "http://127.0.0.1:5173").rstrip("/"),
        api_url=os.environ.get("E2E_API_URL", "http://127.0.0.1:8001").rstrip("/"),
        admin_user=os.environ.get("E2E_ADMIN_USER"),
        admin_password=os.environ.get("E2E_ADMIN_PASSWORD"),
        client_user=os.environ.get("E2E_CLIENT_USER"),
        client_password=os.environ.get("E2E_CLIENT_PASSWORD"),
        # En producción, por defecto, no se escribe nada en la base de datos real.
        allow_writes=_flag("E2E_ALLOW_WRITES", not is_prod),
        # El registro deja una cuenta que no se puede borrar (solo desactivar).
        allow_signup=_flag("E2E_ALLOW_SIGNUP", not is_prod),
        expect_production=_flag("E2E_EXPECT_PRODUCTION", is_prod),
        headless=_flag("E2E_HEADLESS", True),
    )
