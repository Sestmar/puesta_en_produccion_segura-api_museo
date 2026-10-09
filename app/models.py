from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Role(str, Enum):
    ADMIN = "admin"
    VIEWER = "viewer"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(128), nullable=False)
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, default=Role.VIEWER.value
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Artist(Base):
    __tablename__ = "artists"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    nationality: Mapped[str | None] = mapped_column(String(60))
    birth_year: Mapped[int | None]
    death_year: Mapped[int | None]

    artworks: Mapped[list["Artwork"]] = relationship(back_populates="artist")


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    floor: Mapped[int] = mapped_column(nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    artworks: Mapped[list["Artwork"]] = relationship(back_populates="room")


class Artwork(Base):
    __tablename__ = "artworks"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    year: Mapped[int | None]
    technique: Mapped[str | None] = mapped_column(String(80))
    description: Mapped[str | None] = mapped_column(Text)
    artist_id: Mapped[int] = mapped_column(
        ForeignKey("artists.id", ondelete="RESTRICT"), nullable=False
    )
    room_id: Mapped[int | None] = mapped_column(
        ForeignKey("rooms.id", ondelete="RESTRICT")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    artist: Mapped["Artist"] = relationship(back_populates="artworks")
    room: Mapped["Room | None"] = relationship(back_populates="artworks")
