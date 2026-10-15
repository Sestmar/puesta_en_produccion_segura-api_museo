# Frontend del Museo

SPA construida con **React 19**, **Vite**, **TypeScript** y **Tailwind CSS v4**. Ofrece el catálogo público del museo (obras, artistas y salas) y un panel de administración protegido por roles.

## Características

- **Catálogo público**: listados paginados y páginas de detalle de obras, artistas y salas.
- **Autenticación segura**: JWT con *access token* en memoria y *refresh token* en cookie `httpOnly` + `Secure` + `SameSite`. El frontend nunca toca el refresh token.
- **Registro de cuenta**: `/registro` crea una cuenta de cliente, valida con las mismas reglas que el backend e inicia sesión automáticamente.
- **Mi colección**: los usuarios autenticados marcan obras con un corazón (en las tarjetas y en el detalle) y las consultan en `/mi-coleccion`. El cambio se ve al instante y se deshace si la API falla.
- **Panel de gestión**: el admin gestiona obras, artistas, salas, usuarios y el registro de auditoría con verificación de cadena de hashes; el gestor solo ve y gestiona el catálogo.
- **RBAC**: roles `admin`, `manager` (gestor del catálogo) y `client`. El catálogo público no requiere login.
- **Formularios robustos**: React Hook Form + Zod, con mensajes de error accesibles.
- **Datos remotos**: TanStack Query para caché, invalidación y estados de carga/error.
- **Imágenes locales**: las fotos de las obras se descargan a `public/works/` durante el seed/catalogado porque el CDN IIIF del Art Institute de Chicago bloquea el *hotlinking* desde orígenes ajenos a `artic.edu`.
- **Hero animado**: el fondo de la landing alterna suavemente entre varias obras cada 4,5 s.
- **UX/UI**: componentes accesibles sobre Radix UI, tipografía Red Hat, iconos Phosphor y animaciones con Motion. El texto de la interfaz está en castellano neutro.

## Stack tecnológico

- React 19 + React Router v7
- Vite 8
- TypeScript 6 (strict, `verbatimModuleSyntax`, `noUncheckedIndexedAccess`)
- Tailwind CSS v4 con `@tailwindcss/vite`
- Radix UI (select, dialog, dropdown, toast, tooltip, etc.)
- TanStack Query v5
- React Hook Form v7 + Zod v3 + `@hookform/resolvers`
- ESLint 10 flat config

## Estructura del proyecto

```
frontend/
├── public/                 # Assets estáticos
├── scripts/                # Scripts auxiliares (fetch-works.mjs)
├── src/
│   ├── components/
│   │   ├── common/         # Cards, guards, QueryState, PageHeader...
│   │   ├── layout/         # PublicLayout, AdminLayout, SiteHeader, SiteFooter...
│   │   └── ui/             # Componentes base reutilizables (button, input, table...)
│   ├── context/            # AuthContext, AuthProvider
│   ├── data/               # Datos estáticos/comunes
│   ├── hooks/              # Queries, mutations, useAuth, useDebouncedValue
│   ├── lib/
│   │   ├── api/            # Cliente HTTP, endpoints, query keys, tipos
│   │   ├── env.ts          # Variables de entorno tipadas
│   │   ├── format.ts       # Formateo de fechas, números, acciones de auditoría
│   │   ├── forms.ts        # Conversión de tipos para formularios
│   │   ├── validation.ts   # Reglas de usuario y contraseña (iguales a las del backend)
│   │   ├── images.ts       # URLs locales de imágenes del catálogo
│   │   └── utils.ts        # cn() y helpers
│   ├── pages/
│   │   ├── public/         # Home, Artworks, Artists, Rooms, Login, Register, MyCollection, Account, 404...
│   │   └── admin/          # Dashboard, AdminArtworks, AdminArtists, AdminRooms, AdminUsers, AdminAudit
│   ├── App.tsx             # Router principal
│   ├── index.css           # Theme tokens + Tailwind
│   └── main.tsx            # Punto de entrada
├── .env.example            # Variables de entorno de ejemplo
├── Dockerfile              # Multi-target: dev (hot reload) / prod (nginx)
├── nginx.conf              # Configuración de nginx para SPA
├── eslint.config.js        # Flat config ESLint
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Variables de entorno

Copiá `frontend/.env.example` a `frontend/.env` y ajustá:

```bash
VITE_API_URL=http://127.0.0.1:8000
```

| Variable | Descripción | Por defecto |
|---|---|---|
| `VITE_API_URL` | URL base de la API FastAPI | `http://127.0.0.1:8000` |

Las variables de Vite deben comenzar con `VITE_` para ser expuestas al cliente.

## Puesta en marcha

### Requisitos previos

- Node.js 22+ (recomendado usar `nvm`)
- npm (viene con Node)
- API backend corriendo (ver README.md de la raíz)

### Opción A — Local (desarrollo)

```bash
cd frontend
cp .env.example .env        # edita VITE_API_URL si es necesario
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

### Opción B — Docker Compose (junto al backend)

Desde la raíz del proyecto:

```bash
# Copiá y editá las variables de entorno del backend
copy .env.example .env      # Windows
cp .env.example .env        # Linux/macOS

# Levantá PostgreSQL, Redis, API y frontend
docker compose up --build
```

- Frontend: `http://localhost:5173`
- API: `http://127.0.0.1:8001`
- Documentación interactiva: `http://127.0.0.1:8001/docs`

El servicio `frontend` usa el target `dev` del Dockerfile, con hot reload y volumen montado para que los cambios locales se reflejen inmediatamente.

## Scripts disponibles

```bash
npm run dev                       # Servidor de desarrollo Vite
npm run build                     # Typecheck + build de producción en dist/
npm run preview                   # Previsualizar el build de producción
npm run typecheck                 # tsc --noEmit
npm run lint                      # ESLint
node scripts/fetch-works.mjs      # Regenera src/data/works.ts y descarga imágenes a public/works/
```

## Build de producción

```bash
cd frontend
npm ci
npm run build
```

El resultado queda en `frontend/dist/`. Para servirlo con nginx usando el Dockerfile de producción:

```bash
docker build -t museo-frontend --target prod ./frontend
docker run -p 80:80 museo-frontend
```

La imagen de producción:
- Compila la SPA estática.
- Sirve los assets con nginx.
- Aplica compresión gzip.
- Cachea assets hasheados por un año.
- Redirige cualquier ruta a `index.html` para que React Router funcione.

## Flujo de autenticación

1. El usuario inicia sesión en `/login` (o crea su cuenta en `/registro`, que inicia sesión al terminar).
2. El backend responde con el `access_token` en el body **y** setea el `refresh_token` en una cookie `httpOnly`, `Secure`, `SameSite=Lax`, path `/auth`.
3. El frontend guarda el `access_token` en memoria y lo adjunta como `Authorization: Bearer <token>`.
4. Si una petición recibe `401` porque el access token expiró, el cliente HTTP llama a `POST /auth/refresh` y reintenta la petición. El navegador envía la cookie automáticamente; el backend rota la sesión y devuelve un nuevo access token. Si varias peticiones fallan a la vez, comparten un único refresh.
5. Al recargar la página, el access token en memoria se pierde. Si hay una sesión iniciada, `AuthProvider` la recupera con `POST /auth/refresh` y después `/auth/me`. Para saber si merece la pena intentarlo, guarda en `localStorage` un indicador `museo:has-session` que solo dice "hay sesión", sin ningún token. Así, un visitante anónimo no lanza peticiones que acabarían en `401`.
6. Logout, cambio de contraseña y "cerrar todas las sesiones" revocan las sesiones del backend, borran la cookie y el indicador.

## Rutas y permisos

| Ruta | Acceso |
|---|---|
| `/`, `/obras`, `/artistas`, `/salas` y sus detalles | Público |
| `/login`, `/registro` | Público |
| `/cuenta`, `/mi-coleccion` | Cualquier usuario autenticado |
| `/admin` (resumen), `/admin/obras`, `/admin/artistas`, `/admin/salas` | `admin` y `manager` |
| `/admin/usuarios`, `/admin/auditoria` | Solo `admin` |

Los guards de `components/common/guards.tsx` (`RequireAuth`, `RequireStaff`, `RequireAdmin`) y el menú filtrado por rol son solo experiencia de usuario: evitan mostrar pantallas que darían error. La autorización real la aplica el backend en cada petición.

## Conexión con el backend

- El cliente HTTP (`src/lib/api/client.ts`) envía `credentials: "include"` en cada petición para que las cookies crucen orígenes.
- El backend debe tener `allow_credentials=True` en CORS y debe incluir el origen del frontend en `CORS_ORIGINS`.
- En el `docker-compose.yml` raíz ya están configurados los orígenes `http://localhost:5173` y `http://127.0.0.1:5173`, y `REFRESH_COOKIE_SECURE=false` para desarrollo local sobre HTTP.

## Convenciones

- **Imports**: usamos el alias `@/` apuntando a `src/`.
- **Tipado estricto**: `verbatimModuleSyntax` y `noUncheckedIndexedAccess` están activos. Cualquier import de tipo debe usar `import type`.
- **Selectores vacíos**: Radix Select no admite `value=""`; usamos sentinelas como `"all"` o `"none"`.
- **Formularios**: evitamos `z.transform`; las conversiones manuales viven en `src/lib/forms.ts`.
- **Errores**: el componente `QueryState` y el helper `errorMessage` centralizan el manejo de estados de carga/error.

## Imágenes del catálogo

Las imágenes se sirven desde `frontend/public/works/` en lugar de enlazar directamente al CDN IIIF del Art Institute of Chicago. Esto evita que el navegador reciba `403` por la protección de *hotlinking* de `artic.edu` cuando la aplicación corre en `localhost` o en otro dominio propio.

Para regenerar el catálogo y descargar las fotos:

```bash
cd frontend
node scripts/fetch-works.mjs
```

El script:

1. Consulta la API pública del Art Institute de Chicago.
2. Genera `src/data/works.ts` con los metadatos de dominio público.
3. Descarga cada imagen a `public/works/{imageId}.jpg` usando los headers `Referer`/`Origin` de `artic.edu`.
4. Saltea los archivos ya existentes, por lo que es seguro volver a ejecutarlo.

Si querés usar fotos propias, colocalas en `public/works/{imageId}.jpg` y actualizá `src/data/works.ts` con los `imageId` correspondientes.

## Notas de seguridad

- Nunca almacenamos tokens en `localStorage` ni `sessionStorage`. Lo único que va a `localStorage` es el indicador booleano `museo:has-session`, que no sirve como credencial.
- Las contraseñas solo se envían al backend por el formulario; el frontend no las guarda en ningún sitio.
- La cookie de refresh no es accesible mediante JavaScript (`httpOnly`), solo se envía por HTTPS en producción (`Secure`) y restringida a solicitudes del mismo sitio (`SameSite`).
- El CSP del backend es restrictivo; en producción la SPA se sirve como estáticos y no requiere loosening del CSP.
