# 3. Pruebas de estrés y rendimiento

Hay dos niveles de prueba:

- **Selenium**: navegadores reales en paralelo. Mide la experiencia completa del usuario
  (descarga del bundle, ejecución de React, llamadas a la API y renderizado).
- **Locust**: peticiones HTTP directas a la API. Mide la capacidad del servidor y el
  comportamiento de los controles de seguridad bajo carga.

## 3.1 Métricas

| Métrica | Significado |
|---|---|
| **p50 (mediana)** | La mitad de las peticiones o páginas tarda menos que esto. Es el caso típico. |
| **p95** | El 95 % tarda menos que esto. Refleja la experiencia de los usuarios más perjudicados y es la métrica habitual en los SLO. |
| **Máximo** | El peor caso observado. |
| **RPS / páginas por segundo** | Rendimiento (*throughput*) sostenido. |
| **Tasa de error** | Porcentaje de respuestas fallidas. Se separan los **429** (control de seguridad) de los **5xx** (fallo real del servicio). |

## 3.2 Estrés con navegador: Selenium (S1)

Script: [`tests_e2e/stress/selenium_stress.py`](../../tests_e2e/stress/selenium_stress.py).

Cada navegador repite este recorrido *N* veces: **portada → obras → ficha de una obra →
artistas → salas**. Se cronometra cada página hasta que su contenido es visible (el `<h1>` y los
enlaces del listado), no solo hasta el evento `load`. Así se mide lo que percibe el usuario.

| Parámetro | Local | Producción |
|---|---|---|
| Escalones (navegadores concurrentes) | 1, 5, 10, 20 | 1, 5, 10 |
| Recorridos por navegador | 3 | 3 |
| Pausa entre escalones | 5 s | 5 s |

Qué se espera ver: el tiempo por página crece con la concurrencia. Con muchos navegadores, la
SPA hace varias llamadas a la API por página, todas desde la misma IP, así que pueden aparecer
**429** en las rutas más usadas (`/artworks`). En la web se ven como páginas que tardan más o
que muestran un error. Cada escalón guarda `samples.csv` y `summary.json`.

## 3.3 Carga HTTP: Locust

Script: [`tests_e2e/stress/locustfile.py`](../../tests_e2e/stress/locustfile.py). Perfiles:

| Perfil | Qué hace | Espera entre tareas |
|---|---|---|
| `CatalogVisitor` | Anónimo: lista y pagina obras, fichas de obras y artistas, salas, obras por sala, `/health` | 1–3 s |
| `AuthenticatedClient` | Hace login con una cuenta de carga distinta por usuario; consulta `/auth/me` y `/me/favorites` y guarda o quita favoritos | 2–5 s |
| `BruteForceAttacker` | Prueba contraseñas aleatorias contra una cuenta víctima | 0,1–0,5 s |

Clasificación de respuestas en los perfiles legítimos: un **429** cuenta como fallo con el
mensaje «429 rate limited», para verlo aparte en la tabla de errores de Locust. Un **5xx** es
un fallo real. En el atacante, en cambio, **401 y 429 son éxito**, porque significan que el
sistema se defiende. Un 200 sería una contraseña adivinada y un 5xx, una caída bajo ataque.

### Escenarios

| ID | Objetivo | Perfil | Usuarios / ritmo de alta | Duración | Entornos |
|---|---|---|---|---|---|
| **L1** Carga sostenida | Comparar latencias en condiciones normales, **por debajo** del límite de tasa | `CatalogVisitor` | 5 / 1 por s | 3 min | Local y prod |
| **L2** Rampa de estrés | Ver qué pasa al superar el límite: ¿responde el servicio con 429 rápidos o se degrada? | `CatalogVisitor` | 100 / 5 por s | 3 min | Local y prod |
| **L2b** Capacidad bruta | Capacidad real de la pila **sin** el límite de tasa delante (`DEFAULT_RATE_LIMIT` relajado) | `CatalogVisitor` | 200 / 10 por s | 3 min | Solo local |
| **L3** Usuarios con sesión | Rendimiento de rutas autenticadas, con escrituras en local | `AuthenticatedClient` | 9 / 1 cada 15 s (respeta los 5 logins/min) | 4 min | Local (y prod sin escrituras) |
| **L4** Fuerza bruta | El límite de login y el bloqueo de cuenta aguantan un ataque | `BruteForceAttacker` | 5 / 5 por s | 1 min | Local y prod |

Por qué L2b solo en local: relajar el límite en producción sería desactivar un control de
seguridad del servicio público. En local sí se puede, y sirve para separar «lo que aguanta el
servidor» de «lo que deja pasar el control».

Después de L4 se comprueba si la cuenta víctima quedó bloqueada: pasado el minuto del límite de
tasa, un login con la **contraseña correcta** debe seguir devolviendo **401** (bloqueo de
15 min). El resultado se guarda en `locust-bruteforce-<entorno>-<fecha>.json`.

## 3.4 Criterios de aceptación

| Criterio | Umbral |
|---|---|
| L1: p95 de la API en local | < 200 ms |
| L1: p95 de la API en producción | < 800 ms (incluye Internet y TLS) |
| L1: errores | 0 (ni 429 ni 5xx) |
| L2: errores 5xx | 0: el servicio responde 429 en lugar de caerse |
| L2: `/health` durante la rampa | Sigue respondiendo (está exento del límite) |
| L4: logins con éxito del atacante | 0 |
| L4: errores 5xx | 0 |
| L4: cuenta víctima | Bloqueada al terminar (401 con la contraseña correcta) |
| S1: tasa de error con 1 navegador | 0 % |

## 3.5 Resultados

Ver [05-resultados.md](05-resultados.md).
