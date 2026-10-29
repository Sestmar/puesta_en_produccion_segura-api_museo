# Implementación del login social con Google

## Arquitectura general

El login con Google se implementa con el **flujo Authorization Code** de OAuth 2.0. La aplicación delega la autenticación a Google, obtiene un `access_token` vía código de autorización, recupera la identidad del usuario desde `userinfo` y crea/recupera un usuario local para abrir una sesión estándar de la app (mismo mecanismo de refresh cookie + access token que el login tradicional).

La implementación está dividida en:
- `app/oauth.py`: helpers OAuth (configuración, estado firmado, intercambio de código, obtención de identidad, resolución/creación de usuario)
- `app/routers/oauth.py`: endpoints HTTP que exponen el flujo
- Integración con modelos/sesiones/auditoría/cookies existentes

## Configuración

Requiere variables en `.env` (ver `app/config.py`):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (p. ej. `http://localhost:8000/auth/google/callback`)
- `FRONTEND_URL` (para redirección tras éxito/error)

La función `google_configured()` comprueba que ambos `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén definidos. Si no lo están, los endpoints retornan `503 Service Unavailable` con detalle `"Google sign-in is not configured"`.

## Endpoints

### `GET /auth/google/login`
- Rate-limited con `settings.oauth_rate_limit`.
- Si no está configurado → `503`.
- Genera un `state` firmado con `create_state()` (ver siguiente apartado).
- Redirige (`307`) a Google con `build_authorization_url()` usando `client_id`, `redirect_uri`, `response_type=code`, `scope=openid email profile`, `state`, `access_type=online`, `prompt=select_account`.

### `GET /auth/google/callback`
- Rate-limited con `settings.oauth_rate_limit`.
- Si no está configurado → `503`.
- Parámetros: `code`, `state`, `error` (opcionales).
- Si hay `error` o falta `code`/`state` → redirige a `${FRONTEND_URL}/login?oauth=error` (`303`).
- Si `state` es inválido, ha caducado o no coincide con la cookie `oauth_state` → `400 Bad Request` ("Invalid or expired OAuth state").
- Intercambio: `exchange_code(code)` llama a `https://oauth2.googleapis.com/token` con `grant_type=authorization_code`, credenciales y `redirect_uri`. Devuelve el `access_token` o lanza `OAuthError`.
- Identidad: `fetch_userinfo(access_token)` llama a `https://openidconnect.googleapis.com/v1/userinfo` con `Authorization: Bearer`. Requiere `sub`, `email` y que `email_verified` sea exactamente `true` (si falta, se rechaza). Lanza `OAuthError` si falla.
- Usuario: `find_or_create_user(db, subject=identity["sub"], email=identity["email"])` resuelve/crea el usuario local.
- Si el usuario existe pero está inactivo (`user.is_active` False) → registra evento `auth.login.blocked` con `provider: "google"` y redirige a `/login?oauth=error`.
- Si OK: registra evento `auth.oauth.signup` (si creado) o `auth.oauth.login` (si existente) con `username`, `role`, `provider: "google"`. Crea sesión con `create_session(db, user=user, request=request)`, establece cookie refresh httpOnly con `set_refresh_cookie`, redirige a `${FRONTEND_URL}/login?oauth=success`.

## Protección CSRF con `state` firmado y ligado al navegador

El `state` es **sin estado en servidor**:
- `create_state()`: genera `nonce.timestamp` con `secrets.token_urlsafe(24)` y `time.time()`, firma con HMAC-SHA256 usando `settings.secret_key` → `nonce.timestamp.signature`.
- `verify_state(state)`: parsea 3 partes, verifica firma con `hmac.compare_digest`, comprueba que `timestamp` esté dentro de `STATE_MAX_AGE_SECONDS` (600s). Rechaza formato/tampering/caducidad.

La firma solo prueba que el `state` lo emitió el servidor, no que lo haya pedido **este** navegador. Sin más, un atacante podría iniciar el flujo con su propia cuenta de Google, quedarse con la URL del callback (código + `state` válidos) y hacer que la víctima la abra: la víctima acabaría dentro de la cuenta del atacante (*login CSRF*). Por eso:
- `/auth/google/login` guarda el mismo `state` en la cookie `oauth_state` (`httpOnly`, `SameSite=Lax`, `Path=/auth/google`, caduca con el `state`). `Lax` es necesario porque Google vuelve con una navegación GET entre sitios.
- El callback exige además `state_matches(state, cookie)` (comparación en tiempo constante); si falta o no coincide → `400`.
- Toda redirección del callback borra la cookie `oauth_state`.

## Resolución y creación de usuario

`find_or_create_user(db, subject, email)`:
1. Busca por identidad OAuth **únicamente**: `User.oauth_provider == "google"` y `User.oauth_subject == subject`. **No enlaza por email** (previene takeover de cuentas locales).
2. Si existe → `(user, False)`.
3. Si no existe: determina si es el **primer usuario** del sistema (`count(User)==0`). Genera username desde el local-part del email (`_username_from_email`): normaliza, recorta, asegura longitud mínima, añade sufijo numérico si hay colisión. Crea `User` con `hashed_password=None`, `email`, `oauth_provider="google"`, `oauth_subject=subject`, `role=ADMIN` si es primer usuario, sino `CLIENT`. Hace commit con manejo de `IntegrityError` → `OAuthError`. Retorna `(user, True)`.

Notas importantes:
- Usuarios creados por Google **no tienen contraseña** (`hashed_password=None`). El endpoint `PUT /auth/password` rechaza con `400 "This account signs in with Google and has no password"`.
- El login por contraseña (`/auth/login`) rechaza siempre a los usuarios OAuth con `401`. Si `hashed_password` es `None`, se ejecuta igualmente bcrypt contra `DUMMY_HASH` para que el tiempo de respuesta no delate la cuenta, pero el resultado se descarta: el texto en claro de `DUMMY_HASH` está en el código, así que nunca puede servir para autenticar (tests `test_oauth_user_cannot_use_password_login` y `test_oauth_user_cannot_login_with_the_dummy_hash_password`).
- El primer usuario vía Google también se convierte en `admin` (consistente con el bootstrap de `/auth/register`).

## Sesiones, cookies y auditoría

- Tras autenticación OAuth exitosa se crea sesión igual que en login tradicional: `create_session` genera refresh token + registro en `auth_sessions`, `set_refresh_cookie` establece cookie `httpOnly` + `Secure` (configurable con `REFRESH_COOKIE_SECURE`) + `SameSite=Lax` restringida a `Path=/auth`, y expira cualquier copia antigua con `Path=/`. El SPA obtiene el access token llamando a `POST /auth/refresh` tras el redirect.
- Eventos auditados: `auth.oauth.signup`, `auth.oauth.login`, `auth.login.blocked` (usuario inactivo), y los errores se traducen a redirecciones con `?oauth=error`.
- Rate limiting aplicado en `/auth/google/login` y `/auth/google/callback` con `oauth_rate_limit`.

## Migraciones relacionadas

La migración añade soporte OAuth a `users`:
- `email` (nullable)
- `oauth_provider` (nullable)
- `oauth_subject` (nullable)  
- `hashed_password` pasa a nullable (para cuentas sin contraseña)

El test `test_oauth_migration_upgrades_and_downgrades` valida upgrade/downgrade de esta migración.

## Frontend

En el contexto de auth (`frontend/src/context/auth-context.ts`) existe `completeOAuth()` para canjear la cookie httpOnly por un access token tras el flujo OAuth.

La página de login consulta `GET /auth/google/status` y solo muestra "Continuar con Google" si el backend tiene las credenciales configuradas.

## Tests relevantes

Los tests cubren: configuración ausente (503), redirección con state, firma/verificación/caducidad de state, rechazo por tampering, manejo de `error` de Google, primer usuario como admin, reutilización de identidad, creación como client si ya hay usuarios, colisión de username, bloqueo de usuario inactivo, errores de intercambio/userinfo, imposibilidad de login/cambio de password con cuenta Google, idempotencia de `find_or_create_user` y migración.
