# 2. Pruebas funcionales (Selenium)

Código: [`tests_e2e/functional/`](../../tests_e2e/functional/). Cada caso abre Chrome (sin
interfaz gráfica por defecto) contra la URL del entorno y comprueba el resultado tal y como lo
vería un usuario.

## 2.1 Cómo están construidas

- **Selectores estables**: se localizan los elementos por `id` de formulario (`#username`), por
  atributos de accesibilidad (`role="alert"`, `aria-label`, `aria-pressed`) y por el texto del
  `<h1>`. No se depende de clases CSS de Tailwind, que cambian con el diseño.
- **Esperas explícitas** (`WebDriverWait`) en lugar de `sleep`: la prueba avanza en cuanto el
  elemento aparece y falla con un timeout claro si no llega.
- **Sesiones reutilizadas**: un navegador con sesión de cliente y otro con sesión de
  administrador para toda la ejecución. Así no se agota el límite de 5 logins por minuto.
- **Navegación dentro de la SPA** sin recargar: el access token vive en memoria y una recarga
  gastaría una llamada a `/auth/refresh`.
- **Capturas de pantalla automáticas** de cada navegador cuando un caso falla
  (`tests_e2e/results/screenshots/`).
- **Marcadores** para no tocar datos reales: `writes` (escribe en la base de datos), `signup`
  (crea una cuenta), `admin` y `client` (necesitan credenciales). En producción, `writes` y
  `signup` se omiten por defecto.

## 2.2 Catálogo de casos

Leyenda de la columna **Prod**: ✔ se ejecuta, ○ se omite por defecto (escribe datos), ⓘ solo
tiene sentido en producción (en local se omite).

### F1 · Catálogo público (`test_01_public_catalog.py`)

| ID | Caso | Resultado esperado | Prod |
|---|---|---|---|
| F1.1 | Cargar la portada | Título «Museo · Catálogo digital» y obras destacadas enlazadas | ✔ |
| F1.2 | Listado de obras y ficha | Al pulsar la primera obra se abre `/obras/{id}` con su título en el `<h1>` | ✔ |
| F1.3 | Listado de artistas | `<h1>` «Artistas» y enlaces a fichas | ✔ |
| F1.4 | Listado de salas | `<h1>` «Salas» y enlaces a fichas | ✔ |
| F1.5 | Ruta inexistente | El servidor sirve la SPA y esta muestra «Página no encontrada» | ✔ |
| F1.6 | Recorrido sin errores de consola | Ningún error JavaScript ni violación de CSP en la consola del navegador | ✔ |

### F2 · Autenticación (`test_02_authentication.py`)

| ID | Caso | Resultado esperado | Prod |
|---|---|---|---|
| F2.1 | Contraseña demasiado corta | La validación del cliente bloquea el envío; no se gasta un intento en el servidor | ✔ |
| F2.2 | **Anti-enumeración** | Con un usuario inexistente y con uno real con contraseña mala, el mensaje es idéntico: «Usuario o contraseña incorrectos.» | ✔ |
| F2.3 | Login y logout | Tras entrar, la cabecera muestra el usuario. Tras «Cerrar sesión» vuelve a «Ingresar» y, al recargar `/cuenta`, redirige a `/login` (la cookie de refresco se borró) | ✔ |
| F2.4 | Registro | Se crea una cuenta nueva y entra con ella | ○ |
| F2.5 | Registro con contraseñas distintas | Error «no coinciden» sin enviar nada | ✔ |

### F3 · Control de acceso (`test_03_access_control.py`)

El frontend oculta rutas solo por experiencia de usuario. La seguridad real es que **la API
vuelva a comprobar el rol en cada petición**, así que se prueban las dos capas.

| ID | Caso | Resultado esperado | Prod |
|---|---|---|---|
| F3.1 | Anónimo en `/cuenta`, `/mi-coleccion`, `/admin`, `/admin/usuarios` | Redirección a `/login` (4 casos) | ✔ |
| F3.2 | Cliente en sus páginas | Abre «Mi cuenta» y «Mi colección» | ✔ |
| F3.3 | Cliente en `/admin`, `/admin/usuarios`, `/admin/auditoria` | «Acceso restringido» (3 casos) | ✔ |
| F3.4 | **Cliente llamando a la API de admin** saltándose el front | Desde el propio navegador del cliente se pide un token y se llama a `/users`, `/audit` y `/audit/verify`: **403** (3 casos) | ✔ |
| F3.5 | Anónimo en endpoints protegidos | `/users`, `/audit`, `/auth/me`, `/me/favorites` → **401** | ✔ |
| F3.6 | Administrador en el panel | Ve «Resumen» y la tabla de auditoría | ✔ |

### F4 · Favoritos (`test_04_favorites.py`)

| ID | Caso | Resultado esperado | Prod |
|---|---|---|---|
| F4.1 | Anónimo pulsa «Guardar en mi colección» | Redirección a `/login` | ✔ |
| F4.2 | Cliente guarda y quita una obra | El botón pasa a `aria-pressed=true`, la obra aparece en «Mi colección» y desaparece al quitarla | ○ |

### F5 · Gestión del catálogo (`test_05_admin_catalog.py`)

| ID | Caso | Resultado esperado | Prod |
|---|---|---|---|
| F5.1 | CRUD de una sala | Alta, edición (planta 3 → 5) y baja con diálogo de confirmación | ○ |
| F5.2 | Validación del formulario | Sin nombre y con planta 99 muestra «obligatorio» y «entre 0 y 20» | ✔ |

### F6 · Controles de seguridad externos (`test_06_security_controls.py`)

Comprobaciones HTTP directas sobre la configuración desplegada.

| ID | Caso | Resultado esperado | Prod |
|---|---|---|---|
| F6.1 | Cabeceras del frontend | CSP (`default-src 'self'`, `script-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP y nginx sin versión | ✔ |
| F6.2 | CSP `connect-src` | Solo permite la propia API, sin comodines | ✔ |
| F6.3 | Cabeceras de la API | `nosniff`, `DENY`, `X-Request-ID` y sin `Server: uvicorn` | ✔ |
| F6.4 | HSTS | `max-age=31536000` en el frontend y en la API | ✔ |
| F6.5 | HTTP → HTTPS | Redirección 301/308 a `https://` | ⓘ |
| F6.6 | Documentación oculta | `/docs`, `/redoc` y `/openapi.json` → 404 | ✔ |
| F6.7 | CORS con origen ajeno | `https://evil.example` no recibe `Access-Control-Allow-Origin` | ✔ |
| F6.8 | CORS con el propio frontend | Se permite con credenciales | ✔ |
| F6.9 | Errores sin filtraciones | 404 y 422 sin trazas, rutas de fichero ni nombres de SQLAlchemy | ✔ |
| F6.10 | `/metrics` no público | 403/404 desde fuera | ⓘ |
| F6.11 | Cookie de refresco | `HttpOnly`, `SameSite=Lax`, `Path=/auth` y `Secure` con HTTPS. El token de refresco nunca aparece en el JSON | ✔ |

En total son **39 casos** (contando cada parámetro por separado).

## 2.3 Resultados

Ver [05-resultados.md](05-resultados.md#1-pruebas-funcionales).
