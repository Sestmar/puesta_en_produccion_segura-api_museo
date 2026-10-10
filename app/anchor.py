import hashlib
import hmac
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings


class AnchorError(RuntimeError):
    """Raised when the external anchor file is unreadable or tampered with."""


@dataclass(frozen=True)
class AnchorRecord:
    id: int
    entry_hash: str


def _path() -> Path | None:
    raw = settings.audit_anchor_path
    return Path(raw) if raw else None


def _signature(entry_id: int, entry_hash: str, seen_at: str) -> str:
    message = f"{entry_id}|{entry_hash}|{seen_at}"
    return hmac.new(
        settings.secret_key.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def anchor_head(*, id: int, entry_hash: str) -> None:
    """Append the current chain head to the external anchor file.

    The anchor lives outside the database, so a truncation of the audit tail
    (which a pure hash chain cannot detect) becomes visible: the anchored head
    no longer matches the database head.
    """
    path = _path()
    if path is None:
        return
    seen_at = datetime.now(timezone.utc).isoformat()
    line = f"{id}|{entry_hash}|{seen_at}|{_signature(id, entry_hash, seen_at)}\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(line)


def read_anchor() -> AnchorRecord | None:
    """Return the last validly-signed anchor, or None if anchoring is off."""
    path = _path()
    if path is None or not path.exists():
        return None
    last: AnchorRecord | None = None
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        if not raw_line.strip():
            continue
        parts = raw_line.split("|")
        if len(parts) != 4:
            raise AnchorError("malformed anchor line")
        id_str, entry_hash, seen_at, signature = parts
        try:
            entry_id = int(id_str)
        except ValueError as exc:
            raise AnchorError("malformed anchor id") from exc
        expected = _signature(entry_id, entry_hash, seen_at)
        if not hmac.compare_digest(signature, expected):
            raise AnchorError("anchor signature mismatch")
        last = AnchorRecord(id=entry_id, entry_hash=entry_hash)
    return last
