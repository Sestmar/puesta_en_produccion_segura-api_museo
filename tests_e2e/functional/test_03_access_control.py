"""F3. Control de acceso: rutas protegidas en el front y autorización en la API.

El front oculta rutas solo por UX; la seguridad real es que la API vuelva a
comprobar el rol en cada petición. Por eso se prueban las dos capas.
"""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from tests_e2e.browser import spa_navigate, wait, wait_path, wait_text

# Pide un access token con la cookie de refresco del navegador y llama a la API.
FETCH_WITH_SESSION = """
const [api, path, done] = arguments;
(async () => {
  const refresh = await fetch(api + '/auth/refresh', {method: 'POST', credentials: 'include'});
  if (!refresh.ok) { done({refresh: refresh.status}); return; }
  const {access_token} = await refresh.json();
  const res = await fetch(api + path, {headers: {Authorization: 'Bearer ' + access_token}});
  done({refresh: refresh.status, status: res.status});
})().catch((e) => done({error: String(e)}));
"""


@pytest.mark.parametrize("path", ["/cuenta", "/mi-coleccion", "/admin", "/admin/usuarios"])
def test_anonymous_is_redirected_to_login(driver, cfg, path):
    driver.get(cfg.base_url + path)
    wait_path(driver, "/login")


@pytest.mark.client
def test_client_can_open_own_pages(client):
    spa_navigate(client, "/cuenta")
    wait(client).until(
        EC.visibility_of_element_located((By.XPATH, "//h1[normalize-space()='Mi cuenta']"))
    )
    spa_navigate(client, "/mi-coleccion")
    wait(client).until(
        EC.visibility_of_element_located((By.XPATH, "//h1[normalize-space()='Mi colección']"))
    )


@pytest.mark.client
@pytest.mark.parametrize("path", ["/admin", "/admin/usuarios", "/admin/auditoria"])
def test_client_sees_restricted_page_in_admin(client, path):
    spa_navigate(client, path)
    wait_text(client, "Acceso restringido")


@pytest.mark.client
@pytest.mark.parametrize("api_path", ["/users", "/audit", "/audit/verify"])
def test_api_rejects_client_on_admin_endpoints(client, cfg, api_path):
    """Aunque se salte el front, la API devuelve 403 a un cliente."""
    client.set_script_timeout(20)
    result = client.execute_async_script(FETCH_WITH_SESSION, cfg.api_url, api_path)
    assert result.get("refresh") == 200, result
    assert result.get("status") == 403, result


def test_api_rejects_anonymous_on_protected_endpoints(cfg):
    import requests

    for path in ("/users", "/audit", "/auth/me", "/me/favorites"):
        assert requests.get(cfg.api_url + path, timeout=15).status_code == 401, path


@pytest.mark.admin
def test_admin_reaches_admin_panel(admin):
    spa_navigate(admin, "/admin")
    wait(admin).until(
        EC.visibility_of_element_located((By.XPATH, "//h1[normalize-space()='Resumen']"))
    )
    spa_navigate(admin, "/admin/auditoria")
    wait(admin).until(EC.visibility_of_element_located((By.TAG_NAME, "table")))
