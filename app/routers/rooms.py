from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import Artwork, Room, User
from app.schemas import RoomCreate, RoomOut, RoomUpdate

router = APIRouter(prefix="/rooms", tags=["rooms"])


def _get_or_404(room_id: int, db: Session) -> Room:
    room = db.get(Room, room_id)
    if room is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Room not found"
        )
    return room


@router.get("", response_model=list[RoomOut])
def list_rooms(
    db: Annotated[Session, Depends(get_db)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    statement = select(Room).order_by(Room.id).offset(skip).limit(limit)
    return db.scalars(statement).all()


@router.get("/{room_id}", response_model=RoomOut)
def get_room(
    room_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    return _get_or_404(room_id, db)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=RoomOut)
def create_room(
    payload: RoomCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
):
    room = Room(**payload.model_dump())
    db.add(room)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Room name already exists",
        )
    db.refresh(room)
    return room


@router.put("/{room_id}", response_model=RoomOut)
def update_room(
    room_id: int,
    payload: RoomUpdate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
):
    room = _get_or_404(room_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(room, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Room name already exists",
        )
    db.refresh(room)
    return room


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(
    room_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
):
    room = _get_or_404(room_id, db)
    artwork_count = db.scalar(
        select(func.count())
        .select_from(Artwork)
        .where(Artwork.room_id == room_id)
    )
    if artwork_count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete room with registered artworks",
        )
    db.delete(room)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
