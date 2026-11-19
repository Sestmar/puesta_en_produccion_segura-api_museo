"""Pruebas de carga y estrés de la API con Locust.

Perfiles de usuario (se eligen por nombre en la línea de comandos):

- ``CatalogVisitor``: visitante anónimo que navega por el catálogo. Es el
  tráfico mayoritario de un museo.
- ``AuthenticatedClient``: cliente con sesión que consulta su perfil y su
  colección y guarda o quita favoritos (escribe; en producción solo con
  ``LOAD_ALLOW_WRITES=1``).
- ``BruteForceAttacker``: atacante que prueba contraseñas contra una cuenta.
  Sirve para comprobar que el límite de login (429) y el bloqueo de cuenta
  aguantan bajo carga. Nunca debe aparecer un 200 ni un 5xx.

Clasificación de respuestas en los perfiles legítimos: un 429 se marca como
fallo con el mensaje «429 rate limited» para que aparezca separado en la tabla
de errores de Locust; cualquier 5xx es un fallo real del servicio.

Ejemplo (local, interfaz web en http://localhost:8089):
  locust -f tests_e2e/stress/locustfile.py --host http://localhost:8001 CatalogVisitor
"""

import itertools
import json
import os
import random
import threading
import time
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

import locust  # noqa: F401  (antes que requests: gevent parchea ssl al importarse)
import requests
from locust import HttpUser, between, events, task

from tests_e2e.config import load_config

CFG = load_config()
RESULTS_DIR = Path(__file__).resolve().parents[1] / "results"

PREFIX = os.environ.get("LOAD_USER_PREFIX", "loadtest-")
COUNT = int(os.environ.get("LOAD_USER_COUNT", "0") or 0)
PASSWORD = os.environ.get("LOAD_USER_PASSWORD", "")
# La última cuenta de carga se reserva como víctima del ataque de fuerza bruta.
VICTIM = os.environ.get("LOAD_VICTIM_USER", f"{PREFIX}{COUNT:02d}" if COUNT else "")
ALLOW_WRITES = os.environ.get("LOAD_ALLOW_WRITES", "1" if CFG.target == "local" else "0") == "1"

_accounts = itertools.cycle([f"{PREFIX}{i:02d}" for i in range(1, max(COUNT, 2))])
_accounts_lock = threading.Lock()
_catalog: dict[str, list[int]] = {"artworks": [], "artists": [], "rooms": []}
attack_outcomes: Counter[str] = Counter()


def _next_account() -> str:
    with _accounts_lock:
        return next(_accounts)


@events.test_start.add_listener
def _load_catalog_ids(environment, **_kwargs) -> None:
    """Obtiene una vez los ids del catálogo para no gastar límite de tasa en cada usuario."""
    host = environment.host or CFG.api_url
    for resource in _catalog:
        try:
            response = requests.get(f"{host}/{resource}", params={"limit": 100}, timeout=15)
            _catalog[resource] = [item["id"] for item in response.json().get("items", [])]
        except (requests.RequestException, ValueError):
            _catalog[resource] = []


@events.test_stop.add_listener
def _save_attack_outcomes(environment, **_kwargs) -> None:
    if not attack_outcomes:
        return
    # ¿Quedó bloqueada la cuenta? Con la contraseña buena debe seguir dando 401
    # (bloqueo de 15 min). Se espera a que pase la ventana del 429 para que la
    # respuesta refleje el bloqueo y no el límite de tasa.
    lockout_check = None
    if PASSWORD:
        print("Esperando 61 s para comprobar el bloqueo de la cuenta víctima…")
        time.sleep(61)
        host = environment.host or CFG.api_url
        lockout_check = requests.post(
            f"{host}/auth/login",
            data={"username": VICTIM, "password": PASSWORD},
            timeout=15,
        ).status_code
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    path = RESULTS_DIR / f"locust-bruteforce-{CFG.target}-{stamp}.json"
    path.write_text(
        json.dumps(
            {
                "objetivo": CFG.target,
                "victima": VICTIM,
                "respuestas": dict(attack_outcomes),
                "login_con_password_correcta_tras_ataque": lockout_check,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f"Resultado de fuerza bruta: {dict(attack_outcomes)} → {path}")


def _check(response, expected: tuple[int, ...] = (200,)) -> None:
    """Clasifica la respuesta dentro de ``catch_response``."""
    if response.status_code in expected:
        response.success()
    elif response.status_code == 429:
        response.failure("429 rate limited")
    elif response.status_code >= 500:
        response.failure(f"{response.status_code} error del servidor")
    else:
        response.failure(f"{response.status_code} inesperado")


class CatalogVisitor(HttpUser):
    """Visitante anónimo: listados, fichas y paginación."""

    weight = 4
    wait_time = between(1, 3)

    def _get(self, path: str, name: str, **params) -> None:
        with self.client.get(path, params=params or None, name=name, catch_response=True) as r:
            _check(r)

    @task(4)
    def list_artworks(self) -> None:
        self._get("/artworks", "/artworks", skip=random.choice([0, 20, 40]), limit=20)

    @task(3)
    def artwork_detail(self) -> None:
        if _catalog["artworks"]:
            self._get(f"/artworks/{random.choice(_catalog['artworks'])}", "/artworks/{id}")

    @task(2)
    def list_artists(self) -> None:
        self._get("/artists", "/artists", limit=20)

    @task(1)
    def artist_detail(self) -> None:
        if _catalog["artists"]:
            self._get(f"/artists/{random.choice(_catalog['artists'])}", "/artists/{id}")

    @task(2)
    def list_rooms(self) -> None:
        self._get("/rooms", "/rooms")

    @task(1)
    def room_artworks(self) -> None:
        if _catalog["rooms"]:
            self._get("/artworks", "/artworks?room_id", room_id=random.choice(_catalog["rooms"]))

    @task(1)
    def health(self) -> None:
        self._get("/health", "/health")


class AuthenticatedClient(HttpUser):
    """Cliente con sesión: perfil, colección y favoritos."""

    weight = 1
    wait_time = between(2, 5)

    def on_start(self) -> None:
        self.token: str | None = None
        if not (COUNT and PASSWORD):
            raise RuntimeError("Faltan LOAD_USER_COUNT/LOAD_USER_PASSWORD para AuthenticatedClient")
        self.username = _next_account()
        self._login()

    def _login(self) -> None:
        with self.client.post(
            "/auth/login",
            data={"username": self.username, "password": PASSWORD},
            name="/auth/login",
            catch_response=True,
        ) as r:
            _check(r)
            if r.status_code == 200:
                self.token = r.json()["access_token"]

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token}"}

    @task(3)
    def me(self) -> None:
        if not self.token:
            self._login()
            return
        with self.client.get("/auth/me", headers=self._headers(), catch_response=True) as r:
            _check(r)

    @task(3)
    def my_favorites(self) -> None:
        if not self.token:
            return
        with self.client.get("/me/favorites", headers=self._headers(), catch_response=True) as r:
            _check(r)

    @task(2)
    def toggle_favorite(self) -> None:
        if not (self.token and ALLOW_WRITES and _catalog["artworks"]):
            return
        artwork = random.choice(_catalog["artworks"])
        path = f"/me/favorites/{artwork}"
        with self.client.put(
            path, headers=self._headers(), name="/me/favorites/{id} PUT", catch_response=True
        ) as r:
            _check(r, (204,))
        with self.client.delete(
            path, headers=self._headers(), name="/me/favorites/{id} DELETE", catch_response=True
        ) as r:
            _check(r, (204,))

    def on_stop(self) -> None:
        if self.token:
            self.client.post("/auth/logout", headers=self._headers(), name="/auth/logout")


class BruteForceAttacker(HttpUser):
    """Ataque de diccionario contra una cuenta. Éxito = el sistema se defiende."""

    weight = 1
    wait_time = between(0.1, 0.5)

    @task
    def guess_password(self) -> None:
        guess = f"Wrong{random.randint(0, 10**9)}x"
        with self.client.post(
            "/auth/login",
            data={"username": VICTIM, "password": guess},
            name="/auth/login [fuerza bruta]",
            catch_response=True,
        ) as r:
            attack_outcomes[str(r.status_code)] += 1
            if r.status_code in (401, 429):
                r.success()  # la defensa responde como debe
            elif r.status_code == 200:
                r.failure("200: ¡contraseña adivinada!")
            else:
                r.failure(f"{r.status_code} inesperado")
