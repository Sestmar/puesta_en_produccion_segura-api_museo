from datetime import datetime
from enum import Enum

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, func
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
    failed_login_attempts: Mapped[int] = mapped_column(default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    refresh_token_hash: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    user_agent: Mapped[str | None] = mapped_column(String(255))
    ip_address: Mapped[str | None] = mapped_column(String(45))

    user: Mapped["User"] = relationship()


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    action: Mapped[str] = mapped_column(
        String(50), index=True, nullable=False
    )
    actor: Mapped[str | None] = mapped_column(String(50))
    resource_type: Mapped[str | None] = mapped_column(String(50))
    resource_id: Mapped[int | None]
    details: Mapped[dict | None] = mapped_column(JSON)
    ip_address: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(255))
    request_id: Mapped[str | None] = mapped_column(String(100), index=True)
    prev_hash: Mapped[str | None] = mapped_column(String(64))
    entry_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)


class AuditCheckpoint(Base):
    """Signed high-water mark of the last pruned audit entry.

    Retention deletes the oldest ``audit_logs`` rows; without this checkpoint
    the surviving chain would appear broken (its first entry points at a deleted
    ``prev_hash``). The checkpoint records the ``entry_hash`` the surviving chain
    must start from, signed with ``SECRET_KEY`` so it cannot be forged.
    """

    __tablename__ = "audit_checkpoints"

    id: Mapped[int] = mapped_column(primary_key=True)
    through_id: Mapped[int] = mapped_column(nullable=False)
    entry_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    signature: Mapped[str] = mapped_column(String(64), nullable=False)
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
