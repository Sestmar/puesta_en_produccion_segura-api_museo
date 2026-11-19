"""F6. Controles de seguridad visibles desde fuera (cabeceras, cookies, CORS, errores).

Son comprobaciones HTTP directas, sin navegador: verifican la configuración
que protege a la app desplegada, no la interfaz.
"""

import time

import pytest
import requests

TIMEOUT = 15


def _get(url: str, **kwargs) -> requests.Response:
    return requests.get(url, timeout=TIMEOUT, **kwargs)


def test_frontend_security_headers(cfg):
    headers = _get(cfg.base_url + "/").headers
    csp = headers.get("Content-Security-Policy", "")
    assert "default-src 'self'" in csp
    assert "script-src 'self'" in csp
    assert "frame-ancestors 'none'" in csp
    assert "object-src 'none'" in csp
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "camera=()" in headers.get("Permissions-Policy", "")
    assert headers.get("Cross-Origin-Opener-Policy") == "same-origin"
    # server_tokens off: nginx no anuncia su versión.
    assert "/" not in headers.get("Server", "")


def test_frontend_csp_allows_only_own_api(cfg):
    csp = _get(cfg.base_url + "/").headers.get("Content-Security-Policy", "")
    connect = next(d for d in csp.split(";") if d.strip().startswith("connect-src"))
    assert cfg.api_url in connect
    assert "*" not in connect


def test_api_security_headers(cfg):
    response = _get(cfg.api_url + "/health")
    assert response.status_code == 200
    headers = response.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert "uvicorn" not in headers.get("Server", "").lower()
    assert headers.get("X-Request-ID")


def test_hsts_in_production(cfg):
    if not cfg.expect_production:
        pytest.skip("HSTS solo se envía con ENVIRONMENT=production y HTTPS")
    for url in (cfg.base_url + "/", cfg.api_url + "/health"):
        assert "max-age=31536000" in _get(url).headers.get("Strict-Transport-Security", "")


def test_http_redirects_to_https(cfg):
    if not cfg.is_https:
        pytest.skip("El entorno no usa HTTPS")
    for url in (cfg.base_url, cfg.api_url):
        plain = url.replace("https://", "http://", 1) + "/"
        response = _get(plain, allow_redirects=False)
        assert response.status_code in (301, 302, 307, 308), plain
        assert response.headers["Location"].startswith("https://")


def test_api_docs_hidden_in_production(cfg):
    if not cfg.expect_production:
        pytest.skip("La documentación solo se oculta en producción")
    for path in ("/docs", "/redoc", "/openapi.json"):
        assert _get(cfg.api_url + path).status_code == 404, path


def test_cors_rejects_foreign_origin(cfg):
    response = requests.options(
        cfg.api_url + "/artworks",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
        timeout=TIMEOUT,
    )
    assert response.headers.get("Access-Control-Allow-Origin") != "https://evil.example"
    assert response.headers.get("Access-Control-Allow-Origin") != "*"


def test_cors_allows_own_frontend(cfg):
    response = requests.options(
        cfg.api_url + "/artworks",
        headers={"Origin": cfg.base_url, "Access-Control-Request-Method": "GET"},
        timeout=TIMEOUT,
    )
    assert response.headers.get("Access-Control-Allow-Origin") == cfg.base_url
    assert response.headers.get("Access-Control-Allow-Credentials") == "true"


def test_errors_do_not_leak_internals(cfg):
    for path in ("/artworks/no-es-un-id", "/artworks/999999999", "/ruta-inexistente"):
        response = _get(cfg.api_url + path)
        assert response.status_code in (404, 422), path
        body = response.text.lower()
        assert "traceback" not in body
        assert "sqlalchemy" not in body
        assert 'file "' not in body


def test_metrics_not_public_in_production(cfg):
    if cfg.target != "prod":
        pytest.skip("En local /metrics se permite desde la red de Docker")
    assert _get(cfg.api_url + "/metrics").status_code in (403, 404)


@pytest.mark.client
def test_refresh_cookie_flags(cfg):
    """La cookie de refresco es httpOnly, SameSite=Lax y está limitada a /auth."""
    data = {"username": cfg.client_user, "password": cfg.client_password}
    response = requests.post(cfg.api_url + "/auth/login", data=data, timeout=TIMEOUT)
    if response.status_code == 429:  # límite de login por IP: se espera la ventana
        time.sleep(61)
        response = requests.post(cfg.api_url + "/auth/login", data=data, timeout=TIMEOUT)
    assert response.status_code == 200, response.text
    cookie = next(
        v for k, v in response.raw.headers.items() if k.lower() == "set-cookie" and "refresh" in v
    )
    lowered = cookie.lower()
    assert "httponly" in lowered
    assert "samesite=lax" in lowered
    assert "path=/auth" in lowered
    if cfg.is_https:
        assert "secure" in lowered
    # El refresh token nunca viaja en el cuerpo: el front solo recibe el access.
    assert not any("refresh" in key for key in response.json())

    # Se cierra la sesión creada para no acumularla.
    token = response.json()["access_token"]
    requests.post(
        cfg.api_url + "/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
        cookies=response.cookies,
        timeout=TIMEOUT,
    )
