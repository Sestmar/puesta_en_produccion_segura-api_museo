import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


def _strip_blank(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("must not be blank")
    return value


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=72)
    role: Literal["admin", "viewer"] = "viewer"

    @field_validator("password")
    @classmethod
    def password_complexity(cls, value: str) -> str:
        if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
            raise ValueError("must contain at least one letter and one digit")
        return value


class UserOut(ORMModel):
    id: int
    username: str
    role: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ArtistCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    nationality: str | None = Field(default=None, max_length=60)
    birth_year: int | None = Field(default=None, ge=-3000, le=2100)
    death_year: int | None = Field(default=None, ge=-3000, le=2100)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        return _strip_blank(value)

    @model_validator(mode="after")
    def death_year_after_birth_year(self):
        if (
            self.birth_year is not None
            and self.death_year is not None
            and self.death_year < self.birth_year
        ):
            raise ValueError("death_year cannot be before birth_year")
        return self


class ArtistUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    nationality: str | None = Field(default=None, max_length=60)
    birth_year: int | None = Field(default=None, ge=-3000, le=2100)
    death_year: int | None = Field(default=None, ge=-3000, le=2100)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str | None) -> str | None:
        return None if value is None else _strip_blank(value)


class ArtistOut(ORMModel):
    id: int
    name: str
    nationality: str | None
    birth_year: int | None
    death_year: int | None


class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    floor: int = Field(ge=0, le=20)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        return _strip_blank(value)


class RoomUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    floor: int | None = Field(default=None, ge=0, le=20)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str | None) -> str | None:
        return None if value is None else _strip_blank(value)


class RoomOut(ORMModel):
    id: int
    name: str
    floor: int
    description: str | None


class ArtworkCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    year: int | None = Field(default=None, ge=-3000, le=2100)
    technique: str | None = Field(default=None, max_length=80)
    description: str | None = Field(default=None, max_length=5000)
    artist_id: int = Field(ge=1)
    room_id: int | None = Field(default=None, ge=1)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        return _strip_blank(value)


class ArtworkUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    year: int | None = Field(default=None, ge=-3000, le=2100)
    technique: str | None = Field(default=None, max_length=80)
    description: str | None = Field(default=None, max_length=5000)
    artist_id: int | None = Field(default=None, ge=1)
    room_id: int | None = Field(default=None, ge=1)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str | None) -> str | None:
        return None if value is None else _strip_blank(value)


class ArtworkOut(ORMModel):
    id: int
    title: str
    year: int | None
    technique: str | None
    description: str | None
    artist_id: int
    room_id: int | None
