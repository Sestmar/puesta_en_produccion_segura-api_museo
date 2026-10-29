# AGENTS.md

## Stack
- **Backend**: FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, Python 3.13 (`app/`)
- **Frontend**: React 19 + Vite 8 + TypeScript 6 + Tailwind v4 (`frontend/`)
- **DB**: PostgreSQL via `psycopg` in prod/docker; SQLite for local/dev/tests

## Quick start
- **Local (SQLite)**: `python -m venv .venv && .\.venv\Scripts\activate && pip install -r requirements-dev.txt && copy .env.example .env` (set a strong `SECRET_KEY`), `alembic upgrade head`, `uvicorn app.main:app --reload` (http://127.0.0.1:8000; docs at /docs)
- **Docker**: `docker compose up --build` (API :8001, frontend :5173). Migrations run automatically on startup.
- **Seed/catalog images**: `python -m app.seed` (catalog). Images: `cd frontend && node scripts/fetch-works.mjs` (see `frontend/README.md`)

## Auth rules (easy to miss)
- **First user**: `POST /auth/register` only works while there are **no users** and creates an `admin`. 
- **Public signup**: `POST /auth/signup` always creates `client`, rejects `role` (422), is rate-limited, and returns **503 until the first admin exists**.
- **Tokens**: access JWT (30 min) sent as `Authorization: Bearer` (frontend keeps in memory). Refresh token is `httpOnly` + `Secure` + `SameSite=Lax` cookie scoped to `/auth`, **rotated** on `/auth/refresh`; reuse revokes **all sessions**. Sessions are checked via `auth_sessions` (`sid` claim). Logout/password change/session revocation invalidate access immediately.
- **Google OAuth**: `state` is HMAC-signed **and** must match the `oauth_state` cookie set by `/auth/google/login` (login CSRF). OAuth accounts have `hashed_password = NULL` and must never pass `/auth/login`; `DUMMY_HASH` is only for timing and its plaintext is public.
- **Account lockout**: failed logins trigger lockout (`max_failed_attempts`/`lockout_minutes`); errors are generic to avoid user enumeration.

## Migrations & DB
- **No auto-create**: the app does **not** create tables on start. You **must** run `alembic upgrade head`.
- **Alembic**: URL is overridden at runtime from app settings (`alembic.ini` has a placeholder). Commands: `alembic upgrade head`, `alembic downgrade -1`, `alembic revision --autogenerate -m "..."`, `alembic current`.
- **Retention**: `python -m app.retention` prunes expired/revoked sessions and (optionally) old audit logs.

## Tests, lint, types
- **Tests**: `pytest` from repo root (`pythonpath=.`, `testpaths=tests`, `addopts` includes coverage). Coverage gate: **90% branches** (`fail_under = 90`). `app/seed.py` is omitted from coverage.
- **Lint**: `ruff check .` (excludes `alembic/versions`). Config in `pyproject.toml`.
- **Types**: `mypy app` only (tests are ignored by mypy). `check_untyped_defs = true`.
- **Frontend**: from `frontend/` — `npm run dev`, `npm run build` (`tsc --noEmit && vite build`), `npm run typecheck`, `npm run lint`.

## CI gates (must pass)
`.github/workflows/ci.yml` runs on push to `main` and PRs:
1. **test** — `pytest` with coverage gate
2. **quality** — `ruff check .` and `mypy app`
3. **migrations** — against real Postgres: `alembic upgrade head` → `downgrade base` → `upgrade head`
4. **security** — `pip-audit -r requirements.txt` and `gitleaks` (full history)

## Production gotchas
- **Docs hidden**: `ENVIRONMENT=production` returns 404 for `/docs`, `/redoc`, `/openapi.json`.
- **Secrets**: strong `SECRET_KEY` required in prod (weak/example values rejected). `SECRET_KEY` also signs the audit hash chain (rotating it breaks verification of old entries).
- **Cookies/HTTPS**: `REFRESH_COOKIE_SECURE=true` by default. Behind a proxy set `TRUSTED_PROXIES`. `FORCE_HTTPS=true` redirects HTTP→HTTPS (respects `X-Forwarded-Proto`).
- **Audit integrity**: set `AUDIT_ANCHOR_PATH` outside the DB to detect truncation of the audit queue. Pruning moves the chain genesis via a signed checkpoint (`GET /audit/verify` for admins).
- **Rate limiting**: global + per-endpoint limits; use Redis via `RATELIMIT_STORAGE_URI` for multi-worker/multi-replica. `/health` and `/metrics` have specific exemptions.
- **DB pool**: tuned for Postgres (`DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `pool_pre_ping`, `DB_POOL_RECYCLE_SECONDS`); ignored on SQLite.
