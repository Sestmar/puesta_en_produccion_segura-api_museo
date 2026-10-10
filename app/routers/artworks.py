from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.audit import AuditAction, record_event
from app.database import get_db
from app.deps import require_admin
from app.models import Artist, Artwork, Room, User
from app.schemas import ArtworkCreate, ArtworkOut, ArtworkUpdate

router = APIRouter(prefix="/artworks", tags=["artworks"])


def _get_or_404(artwork_id: int, db: Session) -> Artwork:
    artwork = db.get(Artwork, artwork_id)
    if artwork is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Artwork not found"
        )
    return artwork


def _validate_references(
    db: Session,
    artist_id: int | None,
    room_id: int | None,
) -> None:
    if artist_id is not None and db.get(Artist, artist_id) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Artist with id {artist_id} does not exist",
        )
    if room_id is not None and db.get(Room, room_id) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Room with id {room_id} does not exist",
        )


@router.get("", response_model=list[ArtworkOut])
def list_artworks(
    db: Annotated[Session, Depends(get_db)],
    artist_id: Annotated[int | None, Query(ge=1)] = None,
    room_id: Annotated[int | None, Query(ge=1)] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    statement = select(Artwork).order_by(Artwork.id)
    if artist_id is not None:
        statement = statement.where(Artwork.artist_id == artist_id)
    if room_id is not None:
        statement = statement.where(Artwork.room_id == room_id)
    return db.scalars(statement.offset(skip).limit(limit)).all()


@router.get("/{artwork_id}", response_model=ArtworkOut)
def get_artwork(
    artwork_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    return _get_or_404(artwork_id, db)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ArtworkOut)
def create_artwork(
    payload: ArtworkCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    request: Request,
):
    _validate_references(db, payload.artist_id, payload.room_id)
    artwork = Artwork(**payload.model_dump())
    db.add(artwork)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Invalid artist or room reference",
        ) from None
    db.refresh(artwork)
    record_event(
        db,
        action=AuditAction.CREATE,
        actor=current_user.username,
        resource_type="artwork",
        resource_id=artwork.id,
        details={"title": artwork.title},
        request=request,
    )
    return artwork


@router.put("/{artwork_id}", response_model=ArtworkOut)
def update_artwork(
    artwork_id: int,
    payload: ArtworkUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    request: Request,
):
    artwork = _get_or_404(artwork_id, db)
    changes = payload.model_dump(exclude_unset=True)
    next_artist_id = changes.get("artist_id", artwork.artist_id)
    next_room_id = changes.get("room_id", artwork.room_id)
    _validate_references(db, next_artist_id, next_room_id)
    for field, value in changes.items():
        setattr(artwork, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Invalid artist or room reference",
        ) from None
    db.refresh(artwork)
    record_event(
        db,
        action=AuditAction.UPDATE,
        actor=current_user.username,
        resource_type="artwork",
        resource_id=artwork.id,
        details={"title": artwork.title},
        request=request,
    )
    return artwork


@router.delete("/{artwork_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_artwork(
    artwork_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    request: Request,
):
    artwork = _get_or_404(artwork_id, db)
    db.delete(artwork)
    db.commit()
    record_event(
        db,
        action=AuditAction.DELETE,
        actor=current_user.username,
        resource_type="artwork",
        resource_id=artwork_id,
        details={"title": artwork.title},
        request=request,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
