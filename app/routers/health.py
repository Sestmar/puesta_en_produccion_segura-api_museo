from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.ratelimit import limiter

router = APIRouter(tags=["system"])


@router.get("/health")
@limiter.exempt
def liveness():
    """Liveness probe: the process is up. Does not touch the database."""
    return {"status": "ok"}


@router.get("/health/ready")
@limiter.exempt
def readiness(db: Annotated[Session, Depends(get_db)]):
    """Readiness probe: the database is reachable."""
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        )
    return {"status": "ready"}
