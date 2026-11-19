# Pruebas funcionales y de estrés

Documentación de las pruebas funcionales (Selenium) y de estrés (Selenium y Locust) de la
aplicación del museo, ejecutadas **en local y en producción** para compararlas.

## Cómo leer esta carpeta

| Documento | Qué contiene |
|---|---|
| [01-estrategia.md](01-estrategia.md) | Objetivos, alcance, herramientas elegidas, entornos y limitaciones |
| [02-pruebas-funcionales.md](02-pruebas-funcionales.md) | Catálogo de casos funcionales con Selenium (qué se prueba y por qué) |
| [03-pruebas-estres.md](03-pruebas-estres.md) | Escenarios de estrés con Selenium y Locust, métricas y criterios |
| [04-ejecucion.md](04-ejecucion.md) | Cómo reproducir todas las pruebas paso a paso |
| [05-resultados.md](05-resultados.md) | Resultados obtenidos y comparativa local frente a producción |
| [resultados/](resultados/) | Evidencias: informes HTML de Locust, CSV y resúmenes JSON |

## Resumen

- **Funcionales**: 39 casos en 6 bloques: catálogo público, autenticación, control de acceso,
  favoritos, gestión del catálogo y controles de seguridad visibles desde fuera.
- **Estrés con navegador (Selenium)**: N navegadores Chrome en paralelo que recorren la web
  como un visitante real. Mide lo que percibe el usuario.
- **Carga HTTP (Locust)**: cientos de usuarios virtuales contra la API. Mide la capacidad del
  servidor y si los controles de seguridad (límite de tasa, bloqueo de cuenta) aguantan bajo
  carga.

## Relación con los tests que ya existían

El repositorio ya tenía 32 ficheros de tests en `tests/` (pytest + `TestClient` de FastAPI).
Esos tests son **unitarios y de integración**: ejecutan la API en memoria contra SQLite, sin
navegador ni red. Las pruebas de esta carpeta son una capa distinta y complementaria:

| | `tests/` | `tests_e2e/` |
|---|---|---|
| Tipo | Unitarias e integración | Funcionales extremo a extremo y estrés |
| Contra qué | La API en proceso | La aplicación desplegada (local y producción) |
| Cubre el frontend | No | Sí |
| Herramientas | pytest, TestClient | Selenium, Locust, requests |
| En el CI | Sí (cobertura ≥ 90 %) | Se lanzan a mano contra un entorno levantado |

El código está en [`tests_e2e/`](../../tests_e2e/).
