# API de Museo

API REST para un catálogo de museo construida con FastAPI, diseñada siguiendo buenas prácticas de seguridad (autenticación JWT, control de acceso basado en roles, limitación de tasa y validación estricta de entradas).

## Requisitos de la práctica

Cómo cumple el proyecto cada requisito de la aplicación distribuida:

**1. Backend en Python y frontend en React, separados.** El backend (`app/`) es una API FastAPI que solo habla JSON; el frontend (`frontend/`) es una SPA React independiente que consume esa API por HTTP. Cada uno tiene su propio `Dockerfile`, sus dependencias y su servicio en `docker-compose.yml` (`api` en el puerto 8001, `frontend` en el 5173). La comunicación entre orígenes se controla con CORS (`CORS_ORIGINS`, `allow_credentials`).

**2. Registro de usuarios y almacenamiento seguro de las claves.** Cualquiera puede crear una cuenta en `/registro` (`POST /auth/signup`). Las contraseñas:

- nunca se guardan en claro: se almacena solo su hash **bcrypt** con sal aleatoria por contraseña y coste configurable (`BCRYPT_ROUNDS`, por defecto 12, es decir 2¹² iteraciones), lo que hace muy caro un ataque de diccionario aunque se filtre la base de datos;
- deben cumplir una política mínima (8–72 caracteres, al menos una letra y un dígito; 72 es el límite de bcrypt);
- no aparecen en logs, respuestas ni registro de auditoría;
- se comparan con `bcrypt.checkpw`, y un login fallido devuelve el mismo error tanto si el usuario existe como si no (sin enumeración de usuarios).

Además, el registro está limitado por IP (`SIGNUP_RATE_LIMIT`), el cliente no puede elegir su rol (enviar `role` devuelve 422) y no está disponible hasta que existe el primer admin, para que nadie pueda adelantarse en una instalación nueva. Los refresh tokens tampoco se guardan en claro: solo su hash SHA-256.

**3. Al menos tres roles.** `admin`, `manager` y `client`, aplicados en el backend en cada endpoint (ver [Roles y permisos](#roles-y-permisos)). El frontend oculta lo que un rol no puede usar, pero eso es solo comodidad: la autorización real la decide siempre la API, que responde `403` si el rol no basta.

**4. API REST con JWT y refresco de tokens.** Ver [Flujo de autenticación](#flujo-de-autenticación):

- **Access token JWT** firmado con HS256 (`SECRET_KEY`), con los claims `sub` (usuario), `role`, `sid` (id de sesión), `iat` y `exp`, y una vida corta de 30 min (`ACCESS_TOKEN_EXPIRE_MINUTES`). Se envía en `Authorization: Bearer` y el frontend lo guarda solo en memoria (nunca en `localStorage`), por lo que un XSS no puede robarlo de forma persistente.
- **Refresh token** opaco y aleatorio (`secrets.token_urlsafe(48)`) con vida de 14 días (`REFRESH_TOKEN_EXPIRE_DAYS`), entregado en una cookie `httpOnly` + `Secure` + `SameSite=Lax` restringida a `Path=/auth`: JavaScript no puede leerlo y el navegador solo lo manda a los endpoints de autenticación.
- **Rotación**: cada `POST /auth/refresh` invalida el refresh token usado y emite uno nuevo junto con un nuevo access token.
- **Detección de reuso**: si alguien presenta un refresh token ya rotado (señal de robo), se revocan todas las sesiones del usuario.
- **Sin estado en HTTP**: la API no usa sesiones de servidor ni cookies para autorizar; cada petición se autentica solo con el JWT. El claim `sid` se contrasta con la tabla `auth_sessions`, de modo que logout, cambio de contraseña, desactivar la cuenta o "cerrar todas las sesiones" invalidan el access token al instante, sin esperar a que caduque.
- El frontend renueva el access token de forma transparente al recibir un `401` (una única petición de refresh aunque fallen varias a la vez) y, al recargar la página, recupera la sesión con la cookie.

## Roles y permisos

| Acción | Anónimo | `client` | `manager` | `admin` |
|---|:---:|:---:|:---:|:---:|
| Explorar el catálogo (obras, artistas, salas) | ✅ | ✅ | ✅ | ✅ |
| Crear su propia cuenta (`/auth/signup`, siempre como `client`) | ✅ | — | — | — |
| Ver y gestionar su cuenta, contraseña y sesiones | — | ✅ | ✅ | ✅ |
| Guardar obras en favoritos ("Mi colección") | — | ✅ | ✅ | ✅ |
| Crear, editar y borrar obras, artistas y salas | — | — | ✅ | ✅ |
| Crear usuarios con cualquier rol, cambiar roles y desactivar cuentas | — | — | — | ✅ |
| Consultar y verificar el registro de auditoría | — | — | — | ✅ |

El primer usuario del sistema se crea con `POST /auth/register` y es siempre `admin`. El repositorio no incluye usuarios ni contraseñas predefinidos: el seed (`python -m app.seed`) solo carga el catálogo.

## Características

- **Entidades**: artistas, salas y obras (con relaciones e integridad referencial)
- **Autenticación**: flujo de contraseña OAuth2 con *access token* JWT de corta durada (30 min) y *refresh token* opaco entregado en una cookie `httpOnly` + `Secure` + `SameSite`. Revocar la sesión (logout, cambio de contraseña, detección de reuso o cierre de todas las sesiones) invalida el acceso al instante
- **Registro público**: `POST /auth/signup` permite a cualquiera crear su propia cuenta, siempre con el rol `client` (ver [Roles y permisos](#roles-y-permisos))
- **Autorización**: tres roles — `admin` (todo, incluidos usuarios y auditoría), `manager` (gestiona el catálogo: obras, artistas y salas) y `client` (usuario final: explora el catálogo y gestiona sus favoritos); los usuarios no autenticados pueden explorar el catálogo
- **Favoritos por usuario**: cualquier usuario autenticado guarda obras en `/me/favorites`; el propietario se toma siempre del access token y nunca de la URL o del cuerpo, por lo que no es posible leer ni modificar los favoritos de otra persona (sin superficie IDOR)
- **Gestión de usuarios** (solo admin): `GET /users` para listar, y `PATCH /users/{id}` para cambiar el rol o activar/desactivar una cuenta. Desactivar una cuenta revoca sus sesiones en el acto y bloquea el login (con el mismo error genérico, sin revelar el motivo); un admin no puede modificarse a sí mismo, lo que evita el auto-bloqueo
- **Cambio de contraseña**: `PUT /auth/password` exige la contraseña actual, aplica la misma política de complejidad y revoca todas las sesiones del usuario para forzar el re-login en todos sus dispositivos
- **Sesiones**: `GET`/`DELETE /auth/sessions` listan y **cierran todas** las sesiones del solicitante (cerrar todas invalida también la del propio solicitante); `DELETE /auth/sessions/{id}` revoca una puntual. Las sesiones activas por usuario están acotadas (`MAX_SESSIONS_PER_USER`, por defecto 10): al superarlo se revocan las más antiguas al iniciar una nueva sesión
- **Seguridad de contraseñas**: hash bcrypt con sal por contraseña y política de complejidad (8+ caracteres, una letra y un dígito)
- **Protección contra fuerza bruta**: limitación de tasa en `/auth/login` (por defecto 5 solicitudes por minuto por IP), en `/auth/refresh` (`REFRESH_RATE_LIMIT`, por defecto 20/min), en `/auth/signup` (`SIGNUP_RATE_LIMIT`, por defecto 10/hora) **y** bloqueo de cuenta tras `max_failed_attempts` (por defecto 5) fallos consecutivos, con desbloqueo automático después de `lockout_minutes` (por defecto 15)
- **Límite de tasa global**: límite por IP en todas las rutas (por defecto `DEFAULT_RATE_LIMIT`), con `/health` y `/health/ready` exentos; la IP del cliente se resuelve de forma consciente del proxy (`TRUSTED_PROXIES`) y el almacenamiento es configurable (`RATELIMIT_STORAGE_URI`, p. ej. Redis) para despliegues multi-worker/multi-réplica
- **Sin enumeración de usuarios**: mismo error genérico tanto para usuario incorrecto como para contraseña incorrecta
- **Validación estricta de entradas**: esquemas Pydantic (longitudes, rangos, formatos y referencias entre recursos)
- **Cabeceras de seguridad**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`, una `Content-Security-Policy` restrictiva por defecto (configurable mediante `CONTENT_SECURITY_POLICY`) y HSTS en producción
- **Redirección a HTTPS**: con `FORCE_HTTPS=true`, las peticiones HTTP responden `307` hacia HTTPS, respetando `X-Forwarded-Proto` cuando hay un proxy que termina TLS delante
- **CORS**: restringido a los orígenes configurados
- **Secretos** mediante variables de entorno (`.env`), nunca codificados en duro; el arranque falla en producción si el secreto falta o es débil
- **Registro estructurado**: logs JSON de una sola línea con un id por solicitud (`X-Request-ID`, autogenerado o propagado), método, ruta, estado y duración
- **Métricas Prometheus**: `/metrics` expone `http_requests_total`, `http_request_duration_seconds` y `audit_events_total` en formato de texto de exposición, listo para que Prometheus/Grafana lo scrapeen
- **Pool de conexiones sintonizado** para PostgreSQL: tamaño/acceso fijos (`DB_POOL_SIZE`, `DB_MAX_OVERFLOW`), `pool_pre_ping` y reciclado por debajo del timeout del servidor (`DB_POOL_RECYCLE_SECONDS`); se ignora en SQLite
- **Sondas de estado**: `/health` (liveness) y `/health/ready` (readiness, comprueba la base de datos)
- **Registro de auditoría (a prueba de manipulación)**: cada evento de autenticación (alta por admin, registro público, inicio de sesión correcto o fallido, bloqueo, refresh, cierre de sesión y revocación de sesión) y cada operación de escritura (crear/actualizar/eliminar) queda registrado en `audit_logs` con el actor, el recurso, la IP, el user-agent y el `request_id` correlacionado; las credenciales nunca se registran. Cada entrada se encadena con la anterior mediante un HMAC-SHA256 (clave `SECRET_KEY`), de modo que alterar, borrar, reordenar o insertar filas directamente en la base de datos rompe la cadena y queda detectado por `GET /audit/verify` (solo admin). Con `AUDIT_ANCHOR_PATH` definido, la cabecera de la cadena se escribe además en un archivo externo firmado, de modo que el **truncado de la cola** (que la cadena por sí sola no puede detectar) también queda detectado. El registro puede consultarse con `GET /audit` (solo admin)
- **Documentación interactiva** en `/docs` (Swagger UI) y `/redoc`
- **Retención**: `python -m app.retention` elimina sesiones expiradas o revocadas hace más de `SESSION_RETENTION_DAYS` días y, si `AUDIT_RETENTION_DAYS` > 0, entradas de auditoría más antiguas que ese número de días. Podar la auditoría mueve el génesis de la cadena: se guarda un `checkpoint` firmado del último registro eliminado para que `GET /audit/verify` siga validando el tramo restante (0 desactiva la poda de auditoría y conserva todo el histórico)

## Stack tecnológico

**Backend**: FastAPI, SQLAlchemy 2.0, PostgreSQL mediante `psycopg` (SQLite para desarrollo local y pruebas), migraciones con Alembic, Pydantic v2, PyJWT, bcrypt, slowapi, pytest.

**Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, React Router v7, TanStack Query, React Hook Form + Zod, Radix UI.

**Infraestructura**: Docker, Docker Compose, nginx, Redis (para el límite de tasa compartido).

## Puesta en marcha

### Opción A — Docker (PostgreSQL, recomendado)

```bash
docker compose up --build
```

Esto inicia PostgreSQL, Redis, la API y el frontend, aplica las migraciones de Alembic automáticamente y expone:

- Frontend: `http://localhost:5173`
- API: `http://127.0.0.1:8001` (docs en `http://127.0.0.1:8001/docs`)

Los datos de Postgres persisten en el volumen `pgdata`.

### Opción B — Local (SQLite)

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements-dev.txt
copy .env.example .env          # Windows (o: cp .env.example .env)
# edita .env y define un SECRET_KEY fuerte
alembic upgrade head            # crea el esquema
uvicorn app.main:app --reload
```

Base de la API: `http://127.0.0.1:8000` — docs: `http://127.0.0.1:8000/docs`

## Seed de datos e imágenes

El repositorio incluye un script para poblar la base de datos con obras de dominio público del Art Institute of Chicago:

```bash
python -m app.seed
```

Para que el frontend muestre las fotos sin depender del hotlinking del CDN de Chicago, las imágenes se descargan y sirven localmente:

```bash
cd frontend
node scripts/fetch-works.mjs
```

Ver la documentación de `frontend/README.md` para más detalles sobre el manejo de imágenes.

## Migraciones de base de datos (Alembic)

El esquema está versionado con Alembic; la aplicación **no** crea las tablas al arrancar.

```bash
alembic upgrade head                            # aplica todas las migraciones
alembic revision --autogenerate -m "message"    # genera una migración a partir de cambios en los modelos
alembic downgrade -1                            # revierte una migración
alembic current                                 # muestra la revisión aplicada
```

## Ejecución de pruebas

```bash
pip install -r requirements-dev.txt
pytest
```

Las pruebas corren contra SQLite y dejan la suite completa en verde (229 tests). `pytest` aplica además el umbral de cobertura de ramas (mínimo 90 %).

## Calidad del código

```bash
ruff check .   # lint (línea de importación, estilos, sanidad general)
mypy app       # verificación de tipos estáticos
```

## Integración continua (GitHub Actions)

`.github/workflows/ci.yml` ejecuta cuatro gates sobre cada push a `main` y cada pull request:

1. **test** — suite completa con umbral de cobertura (90 % de ramas)
2. **quality** — `ruff check .` y `mypy app`
3. **migrations** — `alembic upgrade head` → `downgrade base` → `upgrade head` contra PostgreSQL real, para verificar ambas direcciones de cada migración
4. **security** — `pip-audit` sobre las dependencias y `gitleaks` para detectar secretos en el repositorio

**Dependabot** (`.github/dependabot.yml`) abre mensualmente PRs de actualización de
dependencias Python y de GitHub Actions con revisión agrupada.

## Respaldo y restauración

Procedimiento probado (dump → pérdida simulada → restore → verificación) en
[`docs/backup-runbook.md`](docs/backup-runbook.md). Incluye la regla crítica de
restaurar siempre la base junto con el ancla de auditoría del mismo respaldo.

La suite cubre autenticación, RBAC, validación, limitación de tasa, integridad referencial y cabeceras de seguridad.

## Flujo de autenticación

El **primer** usuario registrado se convierte automáticamente en `admin` (inicialización). A partir de ahí hay dos formas de crear cuentas:

- **Registro público** (`POST /auth/signup`, página `/registro` del frontend): cualquiera crea su cuenta, siempre como `client`.
- **Alta por un admin** (`POST /auth/register` con token de admin, o el panel de usuarios): permite elegir el rol, por ejemplo para crear un `manager`.

Los ejemplos usan la API local en el puerto 8000; con Docker, usa el 8001. Sustituye `<CONTRASEÑA>` por una propia.

```bash
# 1. Crear el admin inicial (solo funciona mientras la base de datos no tenga usuarios)
curl -X POST http://127.0.0.1:8000/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin\",\"password\":\"<CONTRASEÑA>\"}"

# 2. Registro público de un cliente
curl -X POST http://127.0.0.1:8000/auth/signup ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"ana\",\"password\":\"<CONTRASEÑA>\"}"

# 3. Iniciar sesión: access token en el body, refresh token en cookie httpOnly
curl -X POST http://127.0.0.1:8000/auth/login ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "username=admin&password=<CONTRASEÑA>" ^
  -c cookies.txt

# 4. Crear un recurso del catálogo (admin o manager)
curl -X POST http://127.0.0.1:8000/artists ^
  -H "Authorization: Bearer <ACCESS_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Frida Kahlo\",\"nationality\":\"Mexican\",\"birth_year\":1907}"

# 5. Renovar el access token con la cookie (rota también el refresh token)
curl -X POST http://127.0.0.1:8000/auth/refresh -b cookies.txt -c cookies.txt
```

Con `REFRESH_COOKIE_SECURE=true` (el valor por defecto) la cookie solo viaja por HTTPS, así que el paso 5 no funciona contra `http://`. Para probar en local sin HTTPS define `REFRESH_COOKIE_SECURE=false`, como ya hace `docker-compose.yml`.

`/auth/login` devuelve el `access_token` en el body y setea el `refresh_token` en una cookie `httpOnly`, `Secure`, `SameSite=Lax` (path `/auth`). El frontend no puede leer el refresh token; el navegador lo envía automáticamente en `/auth/refresh`. Los refresh tokens son sesiones revocables del lado del servidor:
`POST /auth/refresh` rota la sesión y la cookie (reutilizar un token ya rotado revoca todas las sesiones del usuario),
`POST /auth/logout` revoca la sesión de la cookie y la borra, y `GET`/`DELETE /auth/sessions` lista y revoca las sesiones activas.

## Endpoints

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| POST | `/auth/register` | admin (abierto con la base de datos vacía) | Crear usuario con cualquier rol |
| POST | `/auth/signup` | público (`SIGNUP_RATE_LIMIT`, por defecto 10/hora) | Registro de un usuario `client`; rechaza el campo `role` (422) y no está disponible hasta que exista el primer admin (503) |
| POST | `/auth/login` | público (con límite de tasa) | Obtener access token; setea refresh token en cookie httpOnly |
| POST | `/auth/refresh` | público (cookie httpOnly) | Rotar refresh token (emite nuevo access token y cookie) |
| POST | `/auth/logout` | público (cookie httpOnly) | Revocar la sesión de la cookie y borrarla |
| DELETE | `/auth/sessions` | bearer | Cerrar todas las sesiones del solicitante (204) |
| GET | `/auth/sessions` | bearer | Listar las sesiones activas del solicitante |
| DELETE | `/auth/sessions/{id}` | bearer | Revocar una sesión (solo el propietario, 204) |
| GET | `/auth/me` | bearer | Usuario actual |
| PUT | `/auth/password` | bearer | Cambiar la contraseña (revoca todas las sesiones) |
| GET | `/users` | admin | Listar usuarios |
| PATCH | `/users/{id}` | admin | Cambiar rol o activar/desactivar una cuenta |
| GET | `/audit` | admin | Consultar el registro de auditoría (filtros por acción/actor/request_id; más reciente primero) |
| GET | `/audit/verify` | admin | Recalcular la cadena de auditoría y reportar el primer registro alterado |
| GET | `/artists`, `/rooms`, `/artworks` | público | Listar (paginado, filtrable) |
| GET | `/artists/{id}`, `/rooms/{id}`, `/artworks/{id}` | público | Detalle (404 si no existe) |
| POST | `/artists`, `/rooms`, `/artworks` | admin o manager | Crear (201) |
| PUT | `/artists/{id}`, `/rooms/{id}`, `/artworks/{id}` | admin o manager | Actualización parcial |
| DELETE | `/artists/{id}`, `/rooms/{id}`, `/artworks/{id}` | admin o manager | Eliminar (204) |
| GET | `/me/favorites` | bearer (cualquier rol) | Obras favoritas del solicitante (paginado, más recientes primero) |
| GET | `/me/favorites/ids` | bearer (cualquier rol) | Ids de las obras favoritas del solicitante |
| PUT | `/me/favorites/{artwork_id}` | bearer (cualquier rol) | Guardar una obra en favoritos (idempotente, 204; 404 si la obra no existe) |
| DELETE | `/me/favorites/{artwork_id}` | bearer (cualquier rol) | Quitar una obra de favoritos (idempotente, 204) |
| GET | `/health` | público | Comprobación de liveness (sin acceso a la base de datos) |
| GET | `/health/ready` | público | Comprobación de readiness (consulta la base de datos; 503 si está caída) |
| GET | `/metrics` | público | Métricas Prometheus en texto de exposición (exento del límite de tasa) |

Parámetros de consulta del listado: `skip`, `limit` (máximo 100); las obras también aceptan los filtros `artist_id` y `room_id`.

Eliminar un artista o una sala que todavía tiene obras devuelve `409 Conflict`.

## Estructura del proyecto

```
frontend/         Aplicación React + Vite + TypeScript + Tailwind (catálogo + panel admin)
  src/            Código fuente, componentes, páginas, hooks y capa API
  Dockerfile      Multi-target: dev (hot reload) / prod (nginx estático)
  nginx.conf      Configuración de nginx para SPA
  README.md       Guía completa del frontend

app/
  main.py         Aplicación FastAPI, middleware, CORS y manejador de límite de tasa
  config.py       Configuración desde variables de entorno (.env)
  database.py     Engine, sesión y pragma de FK para SQLite
  models.py       Modelos SQLAlchemy (users, auth_sessions, audit_logs, artists, rooms, artworks, favorites)
  schemas.py      Esquemas de validación Pydantic
  security.py     Hash bcrypt + creación/verificación de JWT
  deps.py         Dependencias de autenticación (get_current_user, require_role, require_admin, require_catalog_editor)
  audit.py        Helper de AuditLog (acción, actor, recurso, request id) + cadena de hash tamper-evident
  anchor.py       Anclaje externo de la cabecera de la cadena (archivo firmado) para detectar truncado
  checkpoint.py   Checkpoint firmado del último registro podado (mantiene verificable la cadena tras retención)
  retention.py    Limpieza de sesiones expiradas/revocadas y de auditoría antigua (python -m app.retention)
  ratelimit.py    Instancia del limitador de slowapi
  logging_config.py  Formateador JSON + contexto de request-id + configuración de logging
  middleware.py   Cabeceras de seguridad + contexto de solicitud (request id, log de acceso)
  routers/        health, metrics, auth, users, audit, artists, rooms, artworks, favorites
alembic/          Entorno de migraciones + scripts versionados (env.py, versions/)
alembic.ini       Configuración de Alembic (la URL se sobrescribe desde la configuración de la app)
Dockerfile        Imagen multietapa (builder + runtime slim, usuario no root)
docker-compose.yml  API + PostgreSQL con healthchecks
requirements.txt      Dependencias de runtime
requirements-dev.txt  Dependencias de runtime + pruebas
tests/            229 pruebas (auth, registro público, roles y migración de roles, favoritos, RBAC, sesiones, tope de sesiones, revocación de token, bloqueo, cambio de contraseña, gestión de usuarios, auditoría, consulta de auditoría, cadena de hash, ancla externa, retención, cabeceras y CSP, redirección HTTPS, límite de tasa global, proxy-aware, CRUD, límites)
.github/workflows/ci.yml  CI: pruebas, ruff + mypy, migraciones en PostgreSQL, pip-audit y gitleaks
```

## Notas de producción

- Despliega detrás de TLS (HTTPS): los tokens son credenciales bearer y nunca deben viajar por HTTP en claro.
- Define `ENVIRONMENT=production`, un `SECRET_KEY` fuerte (32+ bytes aleatorios) y `CORS_ORIGINS` reales. En producción activá `REFRESH_COOKIE_SECURE=true` para que el navegador solo envíe la cookie de refresh por HTTPS.
- El `SECRET_KEY` también es la clave de la cadena de auditoría: rotarlo invalida la verificación de las entradas anteriores, así que re-encadena (`GET /audit/verify` fallará como advertencia) o conserva el valor previo si necesitas verificar el histórico.
- Define `AUDIT_ANCHOR_PATH` apuntando a un archivo fuera de la base de datos (idealmente en un volumen/permisos separados) para detectar el truncado de la cola de auditoría. Si el atacante controla tanto la base como el archivo de ancla, ninguna de las dos protecciones alcanza: el ancla es defensa en profundidad, no una garantía.
- Programa `python -m app.retention` (cron/timer/CronJob) para evitar que `auth_sessions` y `audit_logs` crezcan sin límite. Para auditoría, si necesitas conservarla indefinidamente, dejá `AUDIT_RETENTION_DAYS=0` y exportá los registros a un almacén externo en vez de podarlos.
- Con `ENVIRONMENT=production`, `/docs`, `/redoc` y `/openapi.json` quedan ocultos (responden 404).
- Apunta `DATABASE_URL` a PostgreSQL (`postgresql+psycopg://user:pass@host:5432/db`).
- Aplica las migraciones al desplegar con `alembic upgrade head` (el servicio de compose lo hace al arrancar).
- Sustituye las credenciales de `POSTGRES_*` y el `SECRET_KEY` del `.env` antes de desplegar: `docker-compose.yml` no arranca sin `POSTGRES_PASSWORD` ni `SECRET_KEY` definidos, y en producción el arranque rechaza el `SECRET_KEY` de ejemplo.
- Con `FORCE_HTTPS=true` (detrás del proxy que termina TLS) la API redirige HTTP → HTTPS. Ajustá `CONTENT_SECURITY_POLICY` si servís la UI de Swagger en un entorno donde `/docs` es accesible; la política estricta por defecto la bloquea.
- El CI (`.github/workflows/ci.yml`) corre las pruebas, `pip-audit` sobre las dependencias y un escaneo de secretos con gitleaks en cada push/PR.
- El `docker-compose.yml` levanta Redis y apunta `RATELIMIT_STORAGE_URI` a él, de modo que el límite de tasa se comparte entre los workers del mismo servicio; en memoria (por proceso) es sólo para desarrollo local.
- Detrás de un proxy inverso, define `TRUSTED_PROXIES` con las IPs del proxy cuyo `X-Forwarded-For` haya que confiar, para que el límite de tasa y los logs vean la IP real del cliente.
- Mantén `uvicorn` detrás de un proxy inverso (nginx/Caddy) que también aplique HTTPS y límites de tamaño de solicitud.
