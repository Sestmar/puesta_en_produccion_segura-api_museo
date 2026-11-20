"""F1. Catálogo público: un visitante anónimo puede recorrer el museo."""

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from tests_e2e.browser import browser_errors, wait, wait_heading, wait_path

ARTWORK_LINK = (By.CSS_SELECTOR, "main a[href^='/obras/']")


def test_home_loads(driver, cfg):
    driver.get(cfg.base_url + "/")
    assert driver.title == "Museo · Catálogo digital"
    wait(driver).until(EC.visibility_of_element_located((By.TAG_NAME, "h1")))
    # Al menos una obra destacada enlazada desde la portada.
    wait(driver).until(EC.presence_of_element_located(ARTWORK_LINK))


def test_artworks_list_and_detail(driver, cfg):
    driver.get(cfg.base_url + "/obras")
    wait_heading(driver, "Obras")
    first = wait(driver).until(EC.element_to_be_clickable(ARTWORK_LINK))
    href = first.get_attribute("href")
    title = first.find_element(By.TAG_NAME, "img").get_attribute("alt")
    first.click()

    path = href.removeprefix(cfg.base_url)
    wait_path(driver, path)
    wait_heading(driver, title)


def test_artists_page(driver, cfg):
    driver.get(cfg.base_url + "/artistas")
    wait_heading(driver, "Artistas")
    wait(driver).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "main a[href^='/artistas/']"))
    )


def test_rooms_page(driver, cfg):
    driver.get(cfg.base_url + "/salas")
    wait_heading(driver, "Salas")
    wait(driver).until(EC.presence_of_element_located((By.CSS_SELECTOR, "main a[href^='/salas/']")))


def test_unknown_route_shows_404_page(driver, cfg):
    # El fallback del servidor sirve index.html y React Router pinta el 404.
    driver.get(cfg.base_url + "/esta-ruta-no-existe")
    wait_heading(driver, "Página no encontrada")


def test_navigation_without_console_errors(driver, cfg):
    """Recorrido completo sin errores JS ni violaciones de CSP en la consola."""
    for path, heading in (("/obras", "Obras"), ("/artistas", "Artistas"), ("/salas", "Salas")):
        driver.get(cfg.base_url + path)
        wait_heading(driver, heading)
    errors = [e for e in browser_errors(driver) if "favicon" not in e]
    # Un 401 de /auth/refresh no aparece: sin sesión previa el front no lo llama.
    assert errors == [], errors
