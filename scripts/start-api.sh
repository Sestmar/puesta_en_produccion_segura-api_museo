#!/bin/sh
# Production entrypoint: apply pending migrations, then hand PID 1 to uvicorn so
# it receives the container's stop signals directly.
set -eu

alembic upgrade head

exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers "${UVICORN_WORKERS:-1}" \
    --no-server-header
