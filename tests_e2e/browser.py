"""Utilidades de Selenium compartidas por las pruebas funcionales y de estrés."""

import logging
import time

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.driver_finder import DriverFinder
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from tests_e2e.config import E2EConfig

log = logging.getLogger("e2e")

DEFAULT_TIMEOUT = 15
# Límite del backend: 5 intentos de login por minuto y por IP.
LOGIN_RATE_WINDOW_SECONDS = 61
RATE_LIMIT_MESSAGE = "Demasiados intentos"


def chrome_options(cfg: E2EConfig, *, headless: bool | None = None) -> webdriver.ChromeOptions:
    options = webdriver.ChromeOptions()
    if cfg.headless if headless is None else headless:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1366,900")
    options.add_argument("--lang=es-ES")
    options.add_argument("--disable-extensions")
    options.add_argument("--no-first-run")
    options.add_argument("--disable-dev-shm-usage")
    # Permite leer la consola del navegador (violaciones de CSP, errores JS).
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    return options


def resolve_driver_path(cfg: E2EConfig) -> str:
    """Resuelve una sola vez la ruta del chromedriver con Selenium Manager.

    Si muchos hilos crean navegadores a la vez, cada uno lanza Selenium Manager y
    todos escriben a la vez ``~/.cache/selenium/se-metadata.json``, que acaba
    corrupto y provoca ``WebDriverException`` al arrancar.
    """
    return DriverFinder(Service(), chrome_options(cfg)).get_driver_path()


def make_driver(
    cfg: E2EConfig, *, headless: bool | None = None, driver_path: str | None = None
) -> WebDriver:
    """Crea un Chrome. Sin ``driver_path``, Selenium Manager busca el chromedriver."""
    options = chrome_options(cfg, headless=headless)
    service = Service(executable_path=driver_path) if driver_path else Service()
    driver = webdriver.Chrome(options=options, service=service)
    driver.set_page_load_timeout(60)
    return driver


def wait(driver: WebDriver, timeout: float = DEFAULT_TIMEOUT) -> WebDriverWait:
    return WebDriverWait(driver, timeout)


def xpath_literal(text: str) -> str:
    """Escapa un texto para usarlo dentro de una expresión XPath."""
    if "'" not in text:
        return f"'{text}'"
    parts = text.split("'")
    return "concat(" + ', "\'", '.join(f"'{p}'" for p in parts) + ")"


def wait_heading(driver: WebDriver, text: str, timeout: float = DEFAULT_TIMEOUT) -> WebElement:
    """Espera un <h1> con ese texto (texto del DOM, sin el text-transform de CSS)."""
    locator = (By.XPATH, f"//h1[normalize-space()={xpath_literal(text)}]")
    return wait(driver, timeout).until(EC.visibility_of_element_located(locator))


def wait_text(driver: WebDriver, text: str, timeout: float = DEFAULT_TIMEOUT) -> WebElement:
    locator = (By.XPATH, f"//*[contains(normalize-space(text()), {xpath_literal(text)})]")
    return wait(driver, timeout).until(EC.visibility_of_element_located(locator))


def wait_path(driver: WebDriver, path: str, timeout: float = DEFAULT_TIMEOUT) -> None:
    """Espera a que la ruta del SPA sea exactamente ``path``."""
    wait(driver, timeout).until(
        lambda d: d.execute_script("return window.location.pathname") == path
    )


def spa_navigate(driver: WebDriver, path: str) -> None:
    """Navega dentro del SPA sin recargar la página.

    El access token vive en memoria: un ``driver.get`` recargaría la app y
    gastaría una llamada a /auth/refresh (limitada a 20/min). React Router
    escucha ``popstate``, así que basta con cambiar el historial.
    """
    driver.execute_script(
        "window.history.pushState({}, '', arguments[0]);"
        "window.dispatchEvent(new PopStateEvent('popstate'));",
        path,
    )


def header_user_button(username: str) -> tuple[str, str]:
    return (By.XPATH, f"//header//button[.//span[normalize-space()={xpath_literal(username)}]]")


def ui_login(
    driver: WebDriver, cfg: E2EConfig, username: str, password: str, *, retries: int = 2
) -> None:
    """Inicia sesión desde el formulario y espera a ver el usuario en la cabecera.

    Si el backend responde 429 (límite de login por IP), espera a que pase la
    ventana y reintenta: es el control de seguridad funcionando, no un fallo.
    """
    for attempt in range(retries + 1):
        driver.get(f"{cfg.base_url}/login")
        user_input = wait(driver).until(EC.element_to_be_clickable((By.ID, "username")))
        user_input.clear()
        user_input.send_keys(username)
        driver.find_element(By.ID, "password").send_keys(password)
        driver.find_element(By.CSS_SELECTOR, "form button[type='submit']").click()

        logged_in = EC.visibility_of_element_located(header_user_button(username))
        alert = EC.visibility_of_element_located((By.CSS_SELECTOR, "form [role='alert']"))
        result = wait(driver).until(EC.any_of(logged_in, alert))
        if result is not None and result.get_attribute("role") != "alert":
            return
        message = driver.find_element(By.CSS_SELECTOR, "form [role='alert']").text
        if RATE_LIMIT_MESSAGE in message and attempt < retries:
            log.warning(
                "Login limitado por el backend (429); esperando %ss", LOGIN_RATE_WINDOW_SECONDS
            )
            time.sleep(LOGIN_RATE_WINDOW_SECONDS)
            continue
        raise AssertionError(f"No se pudo iniciar sesión como {username}: {message}")


def submit_login_expect_error(
    driver: WebDriver, cfg: E2EConfig, username: str, password: str
) -> str:
    """Envía el formulario de login esperando un error y devuelve su texto.

    Si el error es el de límite de tasa, espera la ventana y reintenta una vez,
    para que la prueba compare el mensaje de credenciales y no el del 429.
    """
    for attempt in range(2):
        driver.get(f"{cfg.base_url}/login")
        wait(driver).until(EC.element_to_be_clickable((By.ID, "username"))).send_keys(username)
        driver.find_element(By.ID, "password").send_keys(password)
        driver.find_element(By.CSS_SELECTOR, "form button[type='submit']").click()
        message = (
            wait(driver)
            .until(EC.visibility_of_element_located((By.CSS_SELECTOR, "form [role='alert']")))
            .text
        )
        if RATE_LIMIT_MESSAGE in message and attempt == 0:
            time.sleep(LOGIN_RATE_WINDOW_SECONDS)
            continue
        return message
    return message


def open_account_menu(driver: WebDriver, username: str) -> None:
    wait(driver).until(EC.element_to_be_clickable(header_user_button(username))).click()


OPEN_TOAST = (By.CSS_SELECTOR, "li[data-swipe-direction][data-state='open']")


def wait_toasts_gone(driver: WebDriver, timeout: float = DEFAULT_TIMEOUT) -> None:
    """Espera a que se cierren los avisos (toasts), que pueden tapar botones."""
    wait(driver, timeout).until(EC.invisibility_of_element_located(OPEN_TOAST))


def click_menu_item(driver: WebDriver, text: str) -> None:
    locator = (
        By.XPATH,
        f"//*[@role='menuitem'][contains(normalize-space(.), {xpath_literal(text)})]",
    )
    wait(driver).until(EC.element_to_be_clickable(locator)).click()


def browser_errors(driver: WebDriver) -> list[str]:
    """Mensajes de nivel SEVERE de la consola del navegador."""
    try:
        entries = driver.get_log("browser")
    except Exception:  # pragma: no cover - depende del navegador
        return []
    return [e["message"] for e in entries if e.get("level") == "SEVERE"]


def is_present(driver: WebDriver, locator: tuple[str, str], timeout: float = 3) -> bool:
    try:
        wait(driver, timeout).until(EC.presence_of_element_located(locator))
        return True
    except TimeoutException:
        return False
