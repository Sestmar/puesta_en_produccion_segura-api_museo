from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Artwork, Favorite, User
from app.schemas import ArtworkOut, PageResult

# The owner always comes from the access token, never from the URL or body, so
# one user cannot read or modify another user's favorites (no IDOR surface).
router = APIRouter(prefix="/me/favorites", tags=["favorites"])


@router.get("", response_model=PageResult[ArtworkOut])
def list_favorites(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    statement = (
        select(Artwork)
        .join(Favorite, Favorite.artwork_id == Artwork.id)
        .where(Favorite.user_id == current_user.id)
        .order_by(Favorite.created_at.desc(), Artwork.id.desc())
    )
    total = (
        db.scalar(
            select(func.count())
            .select_from(Favorite)
            .where(Favorite.user_id == current_user.id)
        )
        or 0
    )
    items = db.scalars(statement.offset(skip).limit(limit)).all()
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/ids", response_model=list[int])
def list_favorite_ids(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return db.scalars(
        select(Favorite.artwork_id)
        .where(Favorite.user_id == current_user.id)
        .order_by(Favorite.artwork_id)
    ).all()


@router.put("/{artwork_id}", status_code=status.HTTP_204_NO_CONTENT)
def add_favorite(
    artwork_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if db.get(Artwork, artwork_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Artwork not found"
        )
    if db.get(Favorite, (current_user.id, artwork_id)) is None:
        db.add(Favorite(user_id=current_user.id, artwork_id=artwork_id))
        try:
            db.commit()
        except IntegrityError:
            # A concurrent request saved it first: the end state is the same.
            db.rollback()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{artwork_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(
    artwork_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    db.execute(
        delete(Favorite).where(
            Favorite.user_id == current_user.id, Favorite.artwork_id == artwork_id
        )
    )
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
