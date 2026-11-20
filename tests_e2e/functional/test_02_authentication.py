"""F2. Autenticación: login, errores genéricos, logout y registro."""

import secrets

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from tests_e2e.browser import (
    click_menu_item,
    header_user_button,
    is_present,
    make_driver,
    open_account_menu,
    submit_login_expect_error,
    ui_login,
    wait,
    wait_path,
)

GENERIC_ERROR = "Usuario o contraseña incorrectos."


def test_client_side_validation_blocks_short_password(driver, cfg):
    """Zod valida antes de enviar: no se gasta un intento contra el backend."""
    driver.get(cfg.base_url + "/login")
    wait(driver).until(EC.element_to_be_clickable((By.ID, "username"))).send_keys("alguien")
    driver.find_element(By.ID, "password").send_keys("corta")
    driver.find_element(By.CSS_SELECTOR, "form button[type='submit']").click()
    error = wait(driver).until(
        EC.visibility_of_element_located(
            (By.XPATH, "//*[@role='alert'][contains(., 'al menos 8 caracteres')]")
        )
    )
    assert error.is_displayed()
    assert driver.execute_script("return window.location.pathname") == "/login"


@pytest.mark.client
def test_login_errors_do_not_reveal_if_user_exists(driver, cfg):
    """Anti-enumeración: el mensaje es el mismo exista o no el usuario."""
    unknown = submit_login_expect_error(
        driver, cfg, f"e2e-noexiste-{secrets.token_hex(4)}", "Password123"
    )
    known = submit_login_expect_error(driver, cfg, cfg.client_user, "Incorrecta123")
    assert unknown == GENERIC_ERROR
    assert known == GENERIC_ERROR


@pytest.mark.client
def test_login_and_logout(cfg):
    """Login correcto muestra el usuario; logout lo devuelve a anónimo."""
    d = make_driver(cfg)
    try:
        ui_login(d, cfg, cfg.client_user, cfg.client_password)
        open_account_menu(d, cfg.client_user)
        click_menu_item(d, "Cerrar sesión")
        wait_path(d, "/")
        wait(d).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "header a[href='/login']"))
        )
        assert not is_present(d, header_user_button(cfg.client_user), timeout=1)

        # Tras recargar no se restaura la sesión: la cookie de refresco se borró.
        d.get(cfg.base_url + "/cuenta")
        wait_path(d, "/login")
    finally:
        d.quit()


@pytest.mark.signup
def test_signup_creates_client_and_logs_in(driver, cfg):
    username = f"e2e-{secrets.token_hex(4)}"
    password = f"E2e{secrets.token_hex(6)}9"
    driver.get(cfg.base_url + "/registro")
    wait(driver).until(EC.element_to_be_clickable((By.ID, "signup-username"))).send_keys(username)
    driver.find_element(By.ID, "signup-password").send_keys(password)
    driver.find_element(By.ID, "signup-confirm").send_keys(password)
    driver.find_element(By.CSS_SELECTOR, "form button[type='submit']").click()

    # O entra directamente o, si el login automático choca con el límite de
    # tasa, la app lleva a /login con la cuenta ya creada.
    created = EC.visibility_of_element_located(header_user_button(username))
    pending = EC.visibility_of_element_located(
        (By.XPATH, "//*[@role='status'][contains(., 'Cuenta creada')]")
    )
    wait(driver).until(EC.any_of(created, pending))


def test_signup_rejects_mismatched_passwords(driver, cfg):
    driver.get(cfg.base_url + "/registro")
    wait(driver).until(EC.element_to_be_clickable((By.ID, "signup-username"))).send_keys("e2e-x")
    driver.find_element(By.ID, "signup-password").send_keys("Password123")
    driver.find_element(By.ID, "signup-confirm").send_keys("Password124")
    driver.find_element(By.CSS_SELECTOR, "form button[type='submit']").click()
    wait(driver).until(
        EC.visibility_of_element_located(
            (By.XPATH, "//*[@role='alert'][contains(., 'no coinciden')]")
        )
    )
