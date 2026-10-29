"""Seed the database with public-domain artworks from the Art Institute of Chicago.

Run with:

    python -m app.seed

The script is idempotent: it skips artists, rooms and artworks that already exist.
"""

import json
import re
import sys
import urllib.parse
import urllib.request
from typing import Any

from app.database import SessionLocal
from app.models import Artist, Artwork, Room

AIC_SEARCH = "https://api.artic.edu/api/v1/artworks/search"
FIELDS = "id,title,image_id,artist_display,date_display,department_title,medium_display,place_of_origin"
QUERIES = [
    "painting",
    "sculpture",
    "landscape",
    "portrait",
    "still life",
    "photograph",
    "impressionism",
    "abstract",
    "modern",
    "print",
    "drawing",
    "seascape",
]


def _fetch(url: str) -> dict[str, Any]:
    req = urllib.request.Request(
        url,
        # api.artic.edu answers 403 to the default "Python-urllib" User-Agent.
        headers={
            "User-Agent": "museo-seed/1.0 (educational use)",
            "AIC-User-Agent": "museo-seed (educational use)",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def _extract_year(date_display: str | None) -> int | None:
    if not date_display:
        return None
    match = re.search(r"\b(\d{4})\b", date_display)
    return int(match.group(1)) if match else None


def _parse_artist(artist_display: str | None) -> tuple[str, str | None]:
    if not artist_display:
        return ("Anónimo", None)
    lines = [line.strip() for line in artist_display.split("\n") if line.strip()]
    name = lines[0] if lines else "Anónimo"
    nationality = None
    if len(lines) > 1:
        nationality = lines[1].strip(", ")
    return name, nationality


def _room_for_department(department: str | None) -> tuple[str, int, str]:
    mapping: dict[str, tuple[str, int, str]] = {
        "Painting and Sculpture of Europe": ("Pintura y escultura europea", 1, "Obras clásicas de Europa."),
        "Modern Art": ("Arte moderno", 2, "Arte de los siglos XIX y XX."),
        "Contemporary Art": ("Arte contemporáneo", 2, "Obras recientes y actuales."),
        "Photography and Media": ("Fotografía y medios", 1, "Fotografías históricas y contemporáneas."),
        "Prints and Drawings": ("Grabados y dibujos", 1, "Obras sobre papel."),
        "American Art": ("Arte americano", 1, "Arte de Estados Unidos."),
        "Asian Art": ("Arte asiático", 1, ""),
        "African Art": ("Arte africano", 1, ""),
        "Textiles": ("Textiles", 1, ""),
        "Applied Arts of Europe": ("Artes aplicadas europeas", 1, ""),
    }
    if department and department in mapping:
        return mapping[department]
    # Fallback: derive a generic room name from department or use a default.
    if department:
        return (department, 1, f"Colección de {department.lower()}.")
    return ("Colección general", 1, "Obras varias del museo.")


def seed() -> None:
    db = SessionLocal()
    try:
        seen_artworks: set[int] = set()
        artist_cache: dict[str, Artist] = {}
        room_cache: dict[str, Room] = {}

        for query in QUERIES:
            url = (
                f"{AIC_SEARCH}?q={urllib.parse.quote(query)}"
                f"&fields={FIELDS}"
                f"&limit=8"
                f"&is_public_domain=true"
            )
            try:
                payload = _fetch(url)
            except Exception as exc:  # noqa: BLE001
                print(f"Skipping {query!r}: {exc}")
                continue

            for item in payload.get("data", []):
                if not item.get("image_id") or item["id"] in seen_artworks:
                    continue
                seen_artworks.add(item["id"])

                # Artist
                artist_name, nationality = _parse_artist(item.get("artist_display"))
                artist_name = artist_name[:120]
                nationality = (nationality or "")[:60] or None
                if artist_name not in artist_cache:
                    existing_artist = db.query(Artist).filter(Artist.name == artist_name).first()
                    if existing_artist:
                        artist_cache[artist_name] = existing_artist
                    else:
                        artist = Artist(
                            name=artist_name,
                            nationality=nationality,
                        )
                        db.add(artist)
                        db.flush()
                        artist_cache[artist_name] = artist

                # Room
                department = item.get("department_title") or "Colección general"
                room_name, floor, description = _room_for_department(department)
                if room_name not in room_cache:
                    existing_room = db.query(Room).filter(Room.name == room_name).first()
                    if existing_room:
                        room_cache[room_name] = existing_room
                    else:
                        room = Room(
                            name=room_name,
                            floor=floor,
                            description=description,
                        )
                        db.add(room)
                        db.flush()
                        room_cache[room_name] = room

                # Artwork
                title = item.get("title") or "Sin título"
                title = title[:200]
                existing_artwork = db.query(Artwork).filter(Artwork.title == title, Artwork.artist_id == artist_cache[artist_name].id).first()
                if existing_artwork:
                    continue

                artwork = Artwork(
                    title=title,
                    year=_extract_year(item.get("date_display")),
                    technique=(item.get("medium_display") or "")[:80] or None,
                    description=(item.get("medium_display") or "")[:500] or None,
                    artist_id=artist_cache[artist_name].id,
                    room_id=room_cache[room_name].id,
                )
                db.add(artwork)

        db.commit()
        print(f"Seeded {len(seen_artworks)} artworks.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    sys.exit(0)
