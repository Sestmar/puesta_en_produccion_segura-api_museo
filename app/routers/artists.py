from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.audit import AuditAction, record_event
from app.database import get_db
from app.deps import require_admin
from app.models import Artist, Artwork, User
from app.schemas import ArtistCreate, ArtistOut, ArtistUpdate

router = APIRouter(prefix="/artists", tags=["artists"])


def _get_or_404(artist_id: int, db: Session) -> Artist:
    artist = db.get(Artist, artist_id)
    if artist is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Artist not found"
        )
    return artist


@router.get("", response_model=list[ArtistOut])
def list_artists(
    db: Annotated[Session, Depends(get_db)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    statement = select(Artist).order_by(Artist.id).offset(skip).limit(limit)
    return db.scalars(statement).all()


@router.get("/{artist_id}", response_model=ArtistOut)
def get_artist(
    artist_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    return _get_or_404(artist_id, db)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ArtistOut,
)
def create_artist(
    payload: ArtistCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    request: Request,
):
    artist = Artist(**payload.model_dump())
    db.add(artist)
    db.commit()
    db.refresh(artist)
    record_event(
        db,
        action=AuditAction.CREATE,
        actor=current_user.username,
        resource_type="artist",
        resource_id=artist.id,
        details={"name": artist.name},
        request=request,
    )
    return artist


@router.put("/{artist_id}", response_model=ArtistOut)
def update_artist(
    artist_id: int,
    payload: ArtistUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    request: Request,
):
    artist = _get_or_404(artist_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(artist, field, value)
    db.commit()
    db.refresh(artist)
    record_event(
        db,
        action=AuditAction.UPDATE,
        actor=current_user.username,
        resource_type="artist",
        resource_id=artist.id,
        details={"name": artist.name},
        request=request,
    )
    return artist


@router.delete("/{artist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_artist(
    artist_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    request: Request,
):
    artist = _get_or_404(artist_id, db)
    artwork_count = db.scalar(
        select(func.count())
        .select_from(Artwork)
        .where(Artwork.artist_id == artist_id)
    )
    if artwork_count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete artist with registered artworks",
        )
    db.delete(artist)
    db.commit()
    record_event(
        db,
        action=AuditAction.DELETE,
        actor=current_user.username,
        resource_type="artist",
        resource_id=artist_id,
        details={"name": artist.name},
        request=request,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
