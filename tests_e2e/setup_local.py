"""Prepara las cuentas de prueba en el entorno LOCAL.

- Crea el administrador con POST /auth/register (solo funciona sin usuarios).
- Crea un cliente con POST /auth/signup.
- Crea los usuarios de carga para Locust (``loadtest-01`` … ``loadtest-NN``).

Las contraseñas se generan al azar y se guardan en ``tests_e2e/.env.local``
(ignorado por git) para cargarlas antes de lanzar las pruebas. Nunca se
ejecuta contra producción: allí las cuentas se crean a mano.

Uso:  python -m tests_e2e.setup_local [--load-users 10]
"""

import argparse
import secrets
import sys
from pathlib import Path

import requests

from tests_e2e.config import load_config

ENV_FILE = Path(__file__).parent / ".env.local"


def _password() -> str:
    return f"E2e-{secrets.token_urlsafe(12)}-9a"


def _create(api: str, endpoint: str, username: str, password: str) -> int:
    response = requests.post(
        f"{api}{endpoint}", json={"username": username, "password": password}, timeout=15
    )
    return response.status_code


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--load-users", type=int, default=10)
    args = parser.parse_args()

    cfg = load_config()
    if cfg.target != "local" or not any(h in cfg.api_url for h in ("127.0.0.1", "localhost")):
        print("setup_local solo se ejecuta contra la máquina local.", file=sys.stderr)
        return 2

    admin_pw, client_pw, load_pw = _password(), _password(), _password()
    status = _create(cfg.api_url, "/auth/register", "e2e-admin", admin_pw)
    if status != 201:
        print(f"/auth/register devolvió {status}: ¿la base de datos ya tiene usuarios?")
        print("Para empezar de cero: docker compose down -v", file=sys.stderr)
        return 1
    print("admin e2e-admin creado")

    if _create(cfg.api_url, "/auth/signup", "e2e-cliente", client_pw) != 201:
        print("No se pudo crear e2e-cliente", file=sys.stderr)
        return 1
    print("cliente e2e-cliente creado")

    # /auth/signup admite 10 por hora y por IP; /auth/register como admin no
    # tiene ese límite, así que los usuarios de carga se crean con el admin.
    token = requests.post(
        f"{cfg.api_url}/auth/login",
        data={"username": "e2e-admin", "password": admin_pw},
        timeout=15,
    ).json()["access_token"]
    for i in range(1, args.load_users + 1):
        response = requests.post(
            f"{cfg.api_url}/auth/register",
            json={"username": f"loadtest-{i:02d}", "password": load_pw, "role": "client"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
        if response.status_code != 201:
            print(f"loadtest-{i:02d}: {response.status_code} {response.text}", file=sys.stderr)
            return 1
    print(f"{args.load_users} usuarios de carga creados")

    ENV_FILE.write_text(
        "\n".join(
            [
                "E2E_TARGET=local",
                f"E2E_BASE_URL={cfg.base_url}",
                f"E2E_API_URL={cfg.api_url}",
                # docker-compose.perf.yml arranca la API con ENVIRONMENT=production.
                "E2E_EXPECT_PRODUCTION=1",
                "E2E_ADMIN_USER=e2e-admin",
                f"E2E_ADMIN_PASSWORD={admin_pw}",
                "E2E_CLIENT_USER=e2e-cliente",
                f"E2E_CLIENT_PASSWORD={client_pw}",
                "LOAD_USER_PREFIX=loadtest-",
                f"LOAD_USER_COUNT={args.load_users}",
                f"LOAD_USER_PASSWORD={load_pw}",
                "",
            ]
        ),
        encoding="utf-8",
    )
    print(f"Credenciales guardadas en {ENV_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
