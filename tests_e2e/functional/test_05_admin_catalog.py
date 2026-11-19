"""F5. Gestión del catálogo: un administrador crea, edita y borra una sala."""

import secrets

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from tests_e2e.browser import click_menu_item, spa_navigate, wait, wait_heading, xpath_literal

pytestmark = pytest.mark.admin


def _row(name: str) -> tuple[str, str]:
    return (By.XPATH, f"//table//tr[td[normalize-space()={xpath_literal(name)}]]")


def _open_row_menu(driver, name: str) -> None:
    row = wait(driver).until(EC.visibility_of_element_located(_row(name)))
    row.find_element(By.XPATH, ".//button[@aria-label='Acciones de la fila']").click()


def _fill(driver, element_id: str, value: str) -> None:
    field = wait(driver).until(EC.element_to_be_clickable((By.ID, element_id)))
    field.clear()
    field.send_keys(value)


def _submit_dialog(driver) -> None:
    driver.find_element(By.CSS_SELECTOR, "[role='dialog'] button[type='submit']").click()
    wait(driver).until(EC.invisibility_of_element_located((By.CSS_SELECTOR, "[role='dialog']")))


@pytest.mark.writes
def test_admin_room_crud(admin):
    name = f"E2E Sala {secrets.token_hex(3)}"
    spa_navigate(admin, "/admin/salas")
    wait_heading(admin, "Salas")

    # Alta
    wait(admin).until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Nueva sala')]"))
    ).click()
    _fill(admin, "room-name", name)
    _fill(admin, "room-floor", "3")
    _fill(admin, "room-description", "Sala creada por las pruebas funcionales.")
    _submit_dialog(admin)
    row = wait(admin).until(EC.visibility_of_element_located(_row(name)))
    assert row.find_elements(By.TAG_NAME, "td")[1].text == "3"

    # Edición
    _open_row_menu(admin, name)
    click_menu_item(admin, "Editar")
    _fill(admin, "room-floor", "5")
    _submit_dialog(admin)
    wait(admin).until(
        lambda d: d.find_element(*_row(name)).find_elements(By.TAG_NAME, "td")[1].text == "5"
    )

    # Baja (con diálogo de confirmación)
    _open_row_menu(admin, name)
    click_menu_item(admin, "Eliminar")
    wait(admin).until(
        EC.element_to_be_clickable(
            (By.XPATH, "//*[@role='alertdialog']//button[normalize-space()='Eliminar']")
        )
    ).click()
    wait(admin).until(EC.invisibility_of_element_located(_row(name)))


def test_admin_form_validation(admin):
    """El formulario no envía una sala sin nombre ni con planta fuera de rango."""
    spa_navigate(admin, "/admin/salas")
    wait(admin).until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Nueva sala')]"))
    ).click()
    _fill(admin, "room-floor", "99")
    admin.find_element(By.CSS_SELECTOR, "[role='dialog'] button[type='submit']").click()
    wait(admin).until(
        EC.visibility_of_element_located(
            (By.XPATH, "//*[@role='dialog']//*[@role='alert'][contains(., 'obligatorio')]")
        )
    )
    wait(admin).until(
        EC.visibility_of_element_located(
            (By.XPATH, "//*[@role='dialog']//*[@role='alert'][contains(., 'entre 0 y 20')]")
        )
    )
    admin.find_element(
        By.XPATH, "//*[@role='dialog']//button[normalize-space()='Cancelar']"
    ).click()
