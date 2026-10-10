import pytest
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError

from app.models import Artist, Artwork, Role, Room, User


def test_user_unique_username(db):
    db.add(User(username="alice", hashed_password="x", role=Role.VIEWER.value))
    db.commit()
    db.add(User(username="alice", hashed_password="y", role=Role.VIEWER.value))
    with pytest.raises(IntegrityError):
        db.commit()


def test_user_role_defaults_to_viewer(db):
    db.add(User(username="bob", hashed_password="x"))
    db.commit()
    user = db.scalar(select(User).where(User.username == "bob"))
    assert user.role == Role.VIEWER.value


def test_artwork_requires_existing_artist(db):
    room = Room(name="Sala 1", floor=1)
    artwork = Artwork(title="El grito", artist_id=9999, room=room)
    db.add(artwork)
    with pytest.raises(IntegrityError):
        db.commit()


def test_cannot_delete_artist_with_artworks(db):
    artist = Artist(name="Frida Kahlo")
    db.add(artist)
    db.flush()
    db.add(Artwork(title="Autorretrato", artist_id=artist.id))
    db.commit()
    with pytest.raises(IntegrityError):
        db.execute(delete(Artist).where(Artist.id == artist.id))
        db.commit()


def test_delete_room_with_no_artworks_is_allowed(db):
    room = Room(name="Sala vacia", floor=0)
    db.add(room)
    db.commit()
    db.execute(delete(Room).where(Room.id == room.id))
    db.commit()
    assert db.scalar(select(Room)) is None
