# 1. Estrategia de pruebas

## 1.1 Objetivos

1. **Funcional**: comprobar que los flujos que usa una persona real funcionan de extremo a
   extremo (navegador → frontend React → API FastAPI → PostgreSQL), en local y en producción.
2. **Seguridad**: comprobar desde fuera que los controles desplegados están activos:
   cabeceras, cookies, CORS, control de acceso, mensajes de error genéricos, límite de tasa y
   bloqueo de cuentas.
3. **Rendimiento y estrés**: medir tiempos de respuesta y capacidad, localizar el punto de
   saturación y verificar que los controles de seguridad **siguen funcionando bajo carga**.
4. **Comparativa**: contrastar el entorno local con producción y explicar las diferencias.

## 1.2 Herramientas y por qué

| Herramienta | Para qué | Por qué |
|---|---|---|
| **Selenium 4** (Chrome) | Pruebas funcionales y estrés con navegador | Usa un navegador real: ejecuta el JavaScript de React, aplica la CSP y gestiona cookies como lo haría un usuario. Es lo que pide el enunciado. |
| **Locust 2** | Carga y estrés HTTP sobre la API | Selenium no sirve para generar mucha carga: cada usuario es un Chrome completo (200–300 MB de RAM), así que un portátil no pasa de unas decenas. Locust simula cientos de usuarios con muy pocos recursos y saca percentiles de latencia e informes HTML. |
| **pytest** | Ejecutar y organizar las pruebas funcionales | Es el mismo runner que ya usa el proyecto. |
| **requests** | Comprobaciones HTTP directas (cabeceras, CORS, cookies) | Algunas comprobaciones de seguridad no necesitan navegador. |

Selenium y Locust se complementan: Selenium mide **lo que percibe el usuario** (página
completa renderizada) y Locust mide **lo que aguanta el servidor**.

## 1.3 Entornos

| | Local | Producción |
|---|---|---|
| Dónde | Portátil, `docker compose` con [`docker-compose.perf.yml`](../../docker-compose.perf.yml) | VPS OVHcloud con Dokploy |
| Frontend | nginx sirviendo el build (mismas cabeceras que producción) | Igual, detrás de Traefik |
| API | uvicorn sin `--reload`, `ENVIRONMENT=production` | Igual |
| Base de datos | PostgreSQL 17 en contenedor | PostgreSQL gestionado por Dokploy |
| Límites de tasa | Redis, mismos valores que producción | Redis |
| HTTPS | No (HTTP en `localhost`) | Sí (Let's Encrypt), con HSTS |
| Red | Ninguna (misma máquina) | Internet: latencia real y TLS |

El override `docker-compose.perf.yml` existe para que la comparación sea justa: sin él, el
entorno local usaría el servidor de desarrollo de Vite y uvicorn con recarga automática, que no
se parecen en nada a producción.

## 1.4 Controles de seguridad que condicionan las pruebas

La API aplica estos límites por IP (`app/config.py`):

| Control | Valor |
|---|---|
| Límite por defecto | 100 peticiones/min **por ruta** y por IP |
| `POST /auth/login` | 5/min |
| `POST /auth/refresh` | 20/min |
| `POST /auth/signup` | 10/hora |
| Bloqueo de cuenta | 15 min tras 5 fallos seguidos |

Toda la carga sale **de una sola IP** (la del equipo que lanza las pruebas). Por eso, en
cuanto una ruta supera las 100 peticiones por minuto, la API responde **429**. Eso no es un
fallo de la prueba: **es el resultado esperado** y demuestra que el control funciona. Para
separar las dos cosas se diseñan escenarios distintos (ver [03-pruebas-estres.md](03-pruebas-estres.md)):

- carga **por debajo del límite** para medir latencia de forma comparable;
- carga **por encima del límite** para comprobar que el servicio se defiende sin caerse;
- solo en local, una ejecución con el límite relajado para conocer la **capacidad bruta** de la
  pila sin el control delante.

Las pruebas funcionales también se adaptan a estos límites:

- reutilizan una sesión por rol durante toda la ejecución;
- navegan dentro de la SPA sin recargar la página, para no gastar llamadas a `/auth/refresh`;
- si el login devuelve 429, esperan a que pase la ventana de un minuto y lo reintentan.

## 1.5 Protección del entorno de producción

- Las pruebas se lanzan contra **infraestructura propia** (la VPS del alumno); no se ataca a
  terceros.
- En producción, por defecto, **no se escribe** en la base de datos (`E2E_ALLOW_WRITES=0`) ni
  se crean cuentas (`E2E_ALLOW_SIGNUP=0`). Se usan cuentas dedicadas a las pruebas, nunca
  cuentas personales.
- La carga en producción es más moderada que en local: la VPS comparte recursos con Dokploy y
  otros servicios.
- Las credenciales de prueba viven en `tests_e2e/.env.local` y `tests_e2e/.env.prod`, que están
  en `.gitignore`.

## 1.6 Limitaciones conocidas

- **Una sola IP de origen**: no se puede simular tráfico distribuido real, y el límite por IP
  domina los resultados por encima de unas 100 peticiones por minuto en cada ruta.
- **Selenium no escala**: el estrés con navegador se queda en decenas de usuarios, por límite
  del equipo que lo lanza, no del servidor.
- **El generador de carga comparte máquina** con la aplicación en local, así que ambos compiten
  por la CPU. En producción la carga sale del portátil y atraviesa Internet.
- Las cifras de producción dependen de la red doméstica del momento; por eso cada escenario se
  ejecuta varias veces y se registran fecha y hora.
