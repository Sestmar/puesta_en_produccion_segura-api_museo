"""Fixtures comunes de las pruebas funcionales con Selenium."""

from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path

import pytest
from selenium.webdriver.remote.webdriver import WebDriver

from tests_e2e.browser import make_driver, spa_navigate, ui_login
from tests_e2e.config import E2EConfig, load_config

RESULTS_DIR = Path(__file__).parent / "results"


@pytest.fixture(scope="session")
def cfg() -> E2EConfig:
    return load_config()


def pytest_report_header(config: pytest.Config) -> list[str]:
    c = load_config()
    return [
        f"e2e: target={c.target} base_url={c.base_url} api_url={c.api_url}",
        f"e2e: allow_writes={c.allow_writes} allow_signup={c.allow_signup} "
        f"expect_production={c.expect_production} headless={c.headless}",
    ]


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    c = load_config()
    reasons = {
        "writes": (not c.allow_writes, "E2E_ALLOW_WRITES=0: no se escribe en este entorno"),
        "signup": (not c.allow_signup, "E2E_ALLOW_SIGNUP=0: no se crean cuentas en este entorno"),
        "admin": (not (c.admin_user and c.admin_password), "faltan E2E_ADMIN_USER/PASSWORD"),
        "client": (not (c.client_user and c.client_password), "faltan E2E_CLIENT_USER/PASSWORD"),
    }
    for item in items:
        for marker, (skip, reason) in reasons.items():
            if skip and marker in item.keywords:
                item.add_marker(pytest.mark.skip(reason=reason))


@pytest.fixture
def driver(cfg: E2EConfig) -> Iterator[WebDriver]:
    """Navegador nuevo y anónimo para cada prueba."""
    d = make_driver(cfg)
    yield d
    d.quit()


@pytest.fixture(scope="session")
def client_session(cfg: E2EConfig) -> Iterator[WebDriver]:
    """Navegador con sesión de cliente, reutilizado en toda la ejecución.

    Reutilizarlo evita gastar el límite de 5 logins por minuto del backend.
    """
    assert cfg.client_user and cfg.client_password
    d = make_driver(cfg)
    ui_login(d, cfg, cfg.client_user, cfg.client_password)
    yield d
    d.quit()


@pytest.fixture(scope="session")
def admin_session(cfg: E2EConfig) -> Iterator[WebDriver]:
    assert cfg.admin_user and cfg.admin_password
    d = make_driver(cfg)
    ui_login(d, cfg, cfg.admin_user, cfg.admin_password)
    yield d
    d.quit()


@pytest.fixture
def client(client_session: WebDriver) -> Iterator[WebDriver]:
    """Sesión de cliente situada en la portada al empezar cada prueba."""
    spa_navigate(client_session, "/")
    yield client_session


@pytest.fixture
def admin(admin_session: WebDriver) -> Iterator[WebDriver]:
    spa_navigate(admin_session, "/")
    yield admin_session


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item: pytest.Item, call: pytest.CallInfo):
    """Guarda una captura de pantalla de cada navegador si la prueba falla."""
    outcome = yield
    report = outcome.get_result()
    if report.when != "call" or not report.failed:
        return
    funcargs = getattr(item, "funcargs", {})
    shots = RESULTS_DIR / "screenshots"
    shots.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    for name in ("driver", "client", "admin"):
        d = funcargs.get(name)
        if isinstance(d, WebDriver):
            d.save_screenshot(str(shots / f"{stamp}-{item.name}-{name}.png"))
