# Museum API

REST API for a museum catalog built with FastAPI, designed with security best practices in mind (JWT authentication, role-based access control, rate limiting, strict input validation).

## Features

- **Entities**: artists, rooms, artworks (with relationships and referential integrity)
- **Authentication**: OAuth2 password flow with JWT bearer tokens (30 min expiry)
- **Authorization**: `admin` role for writes, `viewer` role for reads; unauthenticated users can browse the catalog
- **Password security**: bcrypt hashing with per-password salt and complexity policy (8+ chars, letter + digit)
- **Brute-force protection**: rate limiting on `/auth/login` (default 5 attempts per minute per IP)
- **No user enumeration**: identical generic error for wrong username and wrong password
- **Strict input validation**: Pydantic schemas (lengths, ranges, formats, cross-resource references)
- **Security headers**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cross-Origin-Opener-Policy` (plus HSTS in production)
- **CORS**: restricted to configured origins
- **Secrets** via environment variables (`.env`), never hardcoded; startup fails in production if the secret is missing or weak
- **Interactive docs** at `/docs` (Swagger UI) and `/redoc`

## Tech stack

FastAPI, SQLAlchemy 2.0, SQLite (swappable to PostgreSQL via `DATABASE_URL`), Pydantic v2, PyJWT, bcrypt, slowapi, pytest.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env          # Windows (or: cp .env.example .env)
# edit .env and set a strong SECRET_KEY
uvicorn app.main:app --reload
```

API base: `http://127.0.0.1:8000` — docs: `http://127.0.0.1:8000/docs`

## Running tests

```bash
pytest
```

The suite covers authentication, RBAC, validation, rate limiting, referential integrity and security headers.

## Authentication flow

The **first** registered user automatically becomes `admin` (bootstrap). After that, registration requires an admin token.

```bash
# 1. Bootstrap admin (only works while the database has no users)
curl -X POST http://127.0.0.1:8000/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin\",\"password\":\"AdminPass123\"}"

# 2. Login and grab the token
curl -X POST http://127.0.0.1:8000/auth/login ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "username=admin&password=AdminPass123"

# 3. Create a resource (admin only)
curl -X POST http://127.0.0.1:8000/artists ^
  -H "Authorization: Bearer <TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Frida Kahlo\",\"nationality\":\"Mexican\",\"birth_year\":1907}"
```

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | admin (open on empty DB) | Create user |
| POST | `/auth/login` | public (rate limited) | Get JWT |
| GET | `/auth/me` | bearer | Current user |
| GET | `/artists`, `/rooms`, `/artworks` | public | List (paginated, filterable) |
| GET | `/artists/{id}`, `/rooms/{id}`, `/artworks/{id}` | public | Detail (404 if missing) |
| POST | `/artists`, `/rooms`, `/artworks` | admin | Create (201) |
| PUT | `/artists/{id}`, `/rooms/{id}`, `/artworks/{id}` | admin | Partial update |
| DELETE | `/artists/{id}`, `/rooms/{id}`, `/artworks/{id}` | admin | Delete (204) |
| GET | `/health` | public | Liveness check |

List query params: `skip`, `limit` (max 100); artworks also accept `artist_id` and `room_id` filters.

Deleting an artist or room that still has artworks returns `409 Conflict`.

## Project structure

```
app/
  main.py         FastAPI app, middleware, CORS, rate-limit handler
  config.py       Settings from environment (.env)
  database.py     Engine, session, SQLite FK pragma
  models.py       SQLAlchemy models (users, artists, rooms, artworks)
  schemas.py      Pydantic validation schemas
  security.py     bcrypt hashing + JWT creation/verification
  deps.py         Auth dependencies (get_current_user, require_admin)
  ratelimit.py    slowapi limiter instance
  middleware.py   Security headers
  routers/        auth, artists, rooms, artworks
tests/            59 tests (auth, RBAC, CRUD, limits, headers)
```

## Production notes

- Run behind TLS (HTTPS): tokens are bearer credentials and must never travel over plain HTTP.
- Set `ENVIRONMENT=production`, a strong `SECRET_KEY` (32+ random bytes) and real `CORS_ORIGINS`.
- Swap `DATABASE_URL` to PostgreSQL for a real deployment.
- Keep `uvicorn` behind a reverse proxy (nginx/Caddy) that also enforces HTTPS and request size limits.
