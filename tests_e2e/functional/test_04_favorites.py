"""F4. Favoritos: un cliente guarda una obra en su colección y la quita."""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from tests_e2e.browser import spa_navigate, wait, wait_heading, wait_path, xpath_literal

FIRST_ARTWORK = (By.CSS_SELECTOR, "main a[href^='/obras/']")
FAVORITE_BUTTON = (By.XPATH, "//main//button[@aria-pressed][contains(., 'colección')]")


def test_anonymous_favorite_redirects_to_login(driver, cfg):
    driver.get(cfg.base_url + "/obras")
    wait(driver).until(EC.element_to_be_clickable(FIRST_ARTWORK)).click()
    wait(driver).until(EC.element_to_be_clickable(FAVORITE_BUTTON)).click()
    wait_path(driver, "/login")


@pytest.mark.client
@pytest.mark.writes
def test_client_adds_and_removes_favorite(client):
    spa_navigate(client, "/obras")
    wait_heading(client, "Obras")
    link = wait(client).until(EC.element_to_be_clickable(FIRST_ARTWORK))
    title = link.find_element(By.TAG_NAME, "img").get_attribute("alt")
    link.click()
    wait_heading(client, title)

    button = wait(client).until(EC.element_to_be_clickable(FAVORITE_BUTTON))
    if button.get_attribute("aria-pressed") == "true":
        # Restos de una ejecución anterior: se parte de "no guardada".
        button.click()
        wait(client).until(
            lambda d: d.find_element(*FAVORITE_BUTTON).get_attribute("aria-pressed") == "false"
        )
    client.find_element(*FAVORITE_BUTTON).click()
    wait(client).until(
        lambda d: d.find_element(*FAVORITE_BUTTON).get_attribute("aria-pressed") == "true"
    )

    spa_navigate(client, "/mi-coleccion")
    card = (By.XPATH, f"//main//img[@alt={xpath_literal(title)}]")
    wait(client).until(EC.visibility_of_element_located(card))

    # Limpieza: la quita desde el botón superpuesto de la tarjeta.
    remove = (
        By.XPATH,
        f"//main//img[@alt={xpath_literal(title)}]/ancestor::div[contains(@class, 'group')][1]"
        "//button[@aria-label='Quitar de mi colección']",
    )
    wait(client).until(EC.element_to_be_clickable(remove)).click()
    wait(client).until(EC.invisibility_of_element_located(card))
