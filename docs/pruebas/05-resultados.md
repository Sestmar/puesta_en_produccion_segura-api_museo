# 5. Resultados

Ejecución del 20/11/2026. **Local**: portátil con Windows 11 y Docker Desktop
([`docker-compose.perf.yml`](../../docker-compose.perf.yml)). **Producción**: VPS de OVHcloud con
Dokploy y Traefik (`https://museo.37.187.219.34.sslip.io`), con los arreglos de la PR #15 ya
desplegados. Toda la carga sale de una sola IP.

## 5.1 Resumen

| Bloque | Local | Producción |
|---|---|---|
| Funcionales (Selenium) | 37 OK, 2 omitidas, 0 fallos | 34 OK, 5 omitidas, 0 fallos |
| S1: estrés con navegador | Sin errores hasta 5 navegadores; se degrada desde 10 | Sin errores con 1, 5 y 10 navegadores |
| L1: carga sostenida | p95 13 ms, 0 errores | p95 74 ms, 0 errores |
| L2: rampa de estrés | 429 a partir de 100/min, **0 errores 5xx** | 429 a partir de 100/min, **0 errores 5xx** |
| L3: usuarios con sesión | 0 errores | 0 errores |
| L4: fuerza bruta | Bloqueo correcto **después del arreglo** | Bloqueo correcto |

Las pruebas encontraron **dos vulnerabilidades** en la aplicación (§5.6). Las dos se
corrigieron, se volvieron a medir en local y se desplegaron antes de medir producción.

## 5.2 Pruebas funcionales

| Entorno | Correctas | Omitidas | Fallos | Evidencia |
|---|---|---|---|---|
| Local | 37 | 2 | 0 | [`funcionales-local-fix.xml`](resultados/funcionales-local-fix.xml) |
| Producción | 34 | 5 | 0 | [`funcionales-prod.xml`](resultados/funcionales-prod.xml) |

Omitidas a propósito:

- **Local**: HSTS (el entorno local no usa HTTPS) y el bloqueo de `/metrics`, que en local se
  permite desde la red de Docker.
- **Producción**: no se crean cuentas ni se escribe en la base de datos real
  (`E2E_ALLOW_SIGNUP=0`, `E2E_ALLOW_WRITES=0`), y no se usa una cuenta de administrador en las
  pruebas automáticas. Las cuentas de cliente y de carga se crearon con el registro público
  (`/auth/signup`).

En cambio, en producción sí se comprueban dos cosas que en local no se pueden probar: **HSTS**
y que `/docs`, `/redoc` y `/openapi.json` devuelven 404.

## 5.3 Estrés con navegador (S1)

Recorrido por navegador: portada → obras → ficha → artistas → salas, 3 veces.

| Navegadores | Local p50 / p95 | Local errores | Prod p50 / p95 | Prod errores |
|---|---|---|---|---|
| 1 | 0,23 s / 0,69 s | 0 de 15 | 0,70 s / 0,77 s | 0 de 15 |
| 5 | 1,98 s / 4,66 s | 0 de 75 | 1,42 s / 3,37 s | 0 de 75 |
| 10 | 5,37 s / 31,9 s | 7 de 142 (timeout) | 3,00 s / 11,0 s | 0 de 150 |
| 20 | 10,4 s / 52,6 s | 128 de 131 (timeout) | no se ejecuta | — |

Con 1 navegador, local es más rápido porque no hay red. Desde 5 navegadores, **producción es más
rápida que local**. En local, los Chrome, Docker, la API y Postgres comparten la CPU del
portátil, así que el portátil se satura antes que el servidor. Producción solo sirve las
peticiones.

Con 20 navegadores en local, además, la API devolvió **114 respuestas 500** (§5.6, H4).

## 5.4 Carga HTTP con Locust

| Escenario | Entorno | Peticiones | 429 | 5xx | p50 | p95 | RPS |
|---|---|---|---|---|---|---|---|
| L1 (5 usuarios) | Local | 448 | 0 | 0 | 12 ms | 13 ms | 2,5 |
| L1 (5 usuarios) | Prod | 416 | 0 | 0 | 58 ms | 74 ms | 2,4 |
| L2 (100 usuarios) | Local | 8.398 | 6.310 | 0 | 7 ms | 11 ms | 47,1 |
| L2 (100 usuarios) | Prod | 8.068 | 5.985 | 0 | 64 ms | 69 ms | 45,4 |
| L2b (200, sin límite) | Local | 16.226 | 0 | 0 | 62 ms | 150 ms | 90,7 |
| L3 (sesión) | Local (9, con escrituras) | 575 | 0 | 0 | 16 ms | 19 ms | 2,4 |
| L3 (sesión) | Prod (8, sin escrituras) | 322 | 0 | 0 | 61 ms | 79 ms | 1,4 |
| L4 (atacante) | Local, antes del arreglo | 945 | 940 | 0 | 6 ms | 8 ms | 16,0 |
| L4 (atacante) | Local, después del arreglo | 928 | 923 | 0 | 6 ms | 8 ms | 15,8 |
| L4 (atacante) | Prod | 764 | 759 | 0 | 43 ms | 66 ms | 13,1 |

El login de L3 tarda más que el resto (240 ms en local y 630 ms en producción) porque calcula
bcrypt a propósito. En L4 no pasa porque casi todas las peticiones se cortan con 429 antes de
llegar a bcrypt.

### Fuerza bruta: ¿queda bloqueada la cuenta víctima?

| Ejecución | Respuestas al atacante | Login con la contraseña correcta tras el ataque |
|---|---|---|
| Local, antes del arreglo | 5 × 401, 940 × 429 | **200**: no se bloqueó (H2) |
| Local, después del arreglo | 5 × 401, 923 × 429 | **401**: bloqueada 15 min |
| Producción | 5 × 401, 759 × 429 | **401**: bloqueada 15 min |

### Criterios de aceptación ([03-pruebas-estres.md](03-pruebas-estres.md#34-criterios-de-aceptación))

| Criterio | Umbral | Local | Producción |
|---|---|---|---|
| L1: p95 | < 200 ms local / < 800 ms prod | ✔ 13 ms | ✔ 74 ms |
| L1: errores | 0 | ✔ | ✔ |
| L2: errores 5xx | 0 | ✔ | ✔ |
| L2: `/health` durante la rampa | Responde | ✔ 591 de 591 | ✔ 586 de 586 |
| L4: logins con éxito del atacante | 0 | ✔ | ✔ |
| L4: errores 5xx | 0 | ✔ | ✔ |
| L4: cuenta víctima bloqueada | 401 con la contraseña correcta | ✘ antes del arreglo / ✔ después | ✔ |
| S1: error con 1 navegador | 0 % | ✔ | ✔ |

## 5.5 Local frente a producción

- **Latencia**: producción añade unos **45-50 ms** por petición (58 ms frente a 12 ms de mediana
  en L1). Es la ida y vuelta por Internet más TLS: la diferencia es prácticamente la misma en
  todas las rutas, así que no viene de la aplicación.
- **Rendimiento con límite de tasa**: igual en los dos entornos (unas 45-47 RPS en L2), porque lo
  marca el límite de 100 peticiones/min por ruta e IP, no el servidor.
- **Capacidad real**: L2b (solo en local) muestra que, sin el límite, la pila sirve unas 90 RPS
  con p95 de 150 ms y sin errores. En producción no se mide porque habría que desactivar un
  control de seguridad del servicio público.
- **Navegador**: con concurrencia, producción va mejor que local (§5.3), porque en local el
  generador de carga y el servidor compiten por la misma máquina.

## 5.6 Hallazgos

| ID | Hallazgo | Tipo | Severidad | Estado |
|---|---|---|---|---|
| H1 | Bypass del límite de tasa con parámetros de ruta | Seguridad | Media | Corregido (7055605) |
| H2 | Condición de carrera en el bloqueo de cuenta | Seguridad | Alta | Corregido (e24f3ca) |
| H3 | Reenvío de puertos IPv6 de Docker Desktop colgado | Entorno de pruebas | — | Evitado (IPv4) |
| H4 | 500 cuando se agota el pool de conexiones | Robustez | Baja | Pendiente (mejora) |
| H5 | Imágenes del catálogo que faltaban | Funcional | Baja | Corregido (4027a9c) |

### H1. Bypass del límite de tasa con parámetros de ruta

slowapi contaba el límite por **URL concreta** (`key_style="url"`), no por endpoint, así que
cada `/artworks/{id}` tenía su propio cupo de 100 peticiones/min. Bastaba con ir cambiando el id
para no llegar nunca al límite.

- **Evidencia**: en L2 antes del arreglo ([`L2-local-antes-fix`](resultados/L2-local-antes-fix.html)),
  `/artworks/{id}` recibió 1.832 peticiones y `/artists/{id}`, 562, **sin ningún 429**, mientras
  que los listados sí se limitaban.
- **Arreglo**: `key_style="endpoint"` en [`app/ratelimit.py`](../../app/ratelimit.py), con el
  test `test_default_limit_is_shared_across_path_parameters`.
- **Verificación**: después del arreglo, en L2, `/artworks/{id}` da 1.519 respuestas 429 de 1.819
  en local y 1.441 de 1.741 en producción. En producción, 105 peticiones seguidas a ids
  distintos dan 429 a partir de la 101.

### H2. Condición de carrera en el bloqueo de cuenta

El contador de fallos se leía, se sumaba en Python y se escribía (`user.failed_login_attempts += 1`).
Si llegaban varios logins fallidos a la vez, todos leían el mismo valor y se pisaban (*lost
update*). Con 5 intentos en paralelo el contador quedaba en 1 y la cuenta **no se bloqueaba
nunca**.

- **Impacto**: con el límite de 5 logins/min por IP, mandar los 5 intentos en paralelo permite
  probar unas **7.200 contraseñas al día por IP** sin bloqueo, cuando el diseño pretende 5 cada
  15 minutos.
- **Evidencia**: L4 local antes del arreglo: tras el ataque, el login con la contraseña correcta
  da **200** ([`locust-bruteforce-local-20261120T164728Z.json`](resultados/locust-bruteforce-local-20261120T164728Z.json)).
  Reproducido a mano: 5 fallos concurrentes → `failed_login_attempts = 1`, `locked_until = NULL`.
- **Arreglo**: `UPDATE ... SET failed_login_attempts = failed_login_attempts + 1 RETURNING` atómico
  en [`app/routers/auth.py`](../../app/routers/auth.py). El bloqueo se decide con el valor que
  devuelve la base de datos. Test: `test_concurrent_failures_are_not_lost`, que falla sin el
  arreglo.
- **Verificación**: 5 fallos concurrentes → contador 5 y cuenta bloqueada. L4 da 401 en local y
  en producción.

### H3. Reenvío de puertos IPv6 de Docker Desktop

En la primera ejecución de S1 en local, `localhost` resolvía a `::1` y el reenvío de puertos IPv6
de Docker Desktop se quedó colgado: aceptaba la conexión y no respondía, ni en el frontend ni en
la API. Por `127.0.0.1` todo seguía funcionando. Afecta al entorno de pruebas, no a la aplicación.
Se usa `127.0.0.1` en todos los comandos locales
([`selenium-local-20261120T152651Z`](resultados/selenium-local-20261120T152651Z/summary.json), con
220 timeouts con 20 navegadores).

### H4. 500 cuando se agota el pool de conexiones

Con 20 navegadores en local, la API devolvió 114 respuestas **500** (`/artists` 46, `/rooms` 38,
`/artworks` 30) por `QueuePool limit of size 5 overflow 10 reached, timeout 30`. Las rutas son
síncronas y el *threadpool* tiene 40 hilos para 15 conexiones como máximo, así que bajo
saturación hay peticiones que esperan 30 s una conexión y acaban en error.

No es explotable desde fuera tal cual: en producción el límite por IP corta antes. Pero un
servicio saturado debería responder **503 con `Retry-After`** y no 500. Mejora propuesta:
capturar el `TimeoutError` del pool y responder 503, y bajar `pool_timeout`.

### H5. Imágenes del catálogo que faltaban

La prueba funcional de errores de consola detectó tres obras sin imagen (404) en local y en
producción. El CDN IIIF del Art Institute of Chicago respondía 403 a 1.600 px. Se corrigió
descargando a otro tamaño y añadiendo un *placeholder* compatible con la CSP.

## 5.7 Protección frente a DoS y DDoS

Lo que las pruebas demuestran:

- **Un solo origen no tumba el servicio.** Con 100 usuarios desde una IP (L2), la API responde
  429 en unos 64 ms y **ningún 5xx**, en local y en producción. El límite corta la carga antes
  de que llegue a la base de datos.
- **El límite cubre todas las rutas**, también las que tienen parámetros, después de H1.
- **`/health` sigue respondiendo** bajo carga (está exento), así que la monitorización y Dokploy
  no confunden un ataque con una caída.
- **La fuerza bruta no avanza**: 5 intentos por minuto y por IP, y la cuenta se bloquea 15 minutos
  aunque los intentos lleguen en paralelo (H2).
- **El estado del límite es compartido** (Redis), así que vale con varios *workers* o réplicas.

Lo que **no** cubren los controles de la aplicación:

- **Ataques distribuidos (DDoS)**: el límite es por IP. Con muchas IP, cada una por debajo de
  100 peticiones/min, la carga total llega a la aplicación. L2b muestra que la pila de local
  sirve unas 90 RPS sin errores, y H4 muestra que, al saturarse, responde 500 en lugar de
  degradarse. La defensa frente a DDoS tiene que estar **antes de la aplicación**: límites y
  filtros en Traefik o, mejor, un proxy con mitigación DDoS (Cloudflare, AWS WAF/CloudFront; ver
  [presupuesto.md](../presupuesto.md)).
- **Ataques volumétricos** (saturar el ancho de banda de la VPS): solo se paran en la red del
  proveedor o en una CDN, nunca en la aplicación.
- **Bloqueo de cuentas como DoS**: un atacante puede bloquear la cuenta de otra persona fallando
  5 veces. Es el precio del bloqueo por cuenta. Se puede reducir con un bloqueo progresivo o con
  un CAPTCHA tras varios fallos.

Estas pruebas no incluyen un DDoS real: generarlo desde muchas IP contra un servidor público
sería un ataque, no una prueba.

## 5.8 Evidencias

Todas están en [`resultados/`](resultados/):

| Prueba | Ficheros |
|---|---|
| Funcionales | `funcionales-local-fix.xml`, `funcionales-prod.xml` |
| S1 | `selenium-local-20261120T152651Z/` (por `localhost`, H3), `selenium-local-20261120T155138Z/`, `selenium-prod-20261120T185808Z/` |
| L1–L4 | `L*-local*.html` / `L*-prod.html` (informe de Locust) y `*_stats.csv`, `*_failures.csv` |
| Bloqueo de cuenta | `locust-bruteforce-*.json` |
