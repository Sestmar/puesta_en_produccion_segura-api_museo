import hashlib
import hmac
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.config import settings
from app.models import AuditCheckpoint

_SINGLETON_ID = 1


class CheckpointError(RuntimeError):
    """Raised when the stored audit checkpoint fails signature validation."""


@dataclass(frozen=True)
class CheckpointRecord:
    through_id: int
    entry_hash: str


def _signature(through_id: int, entry_hash: str) -> str:
    message = f"{through_id}|{entry_hash}"
    return hmac.new(
        settings.secret_key.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def save_checkpoint(db: Session, *, through_id: int, entry_hash: str) -> AuditCheckpoint:
    """Persist the high-water mark of the pruned audit chain."""
    signature = _signature(through_id, entry_hash)
    row = db.get(AuditCheckpoint, _SINGLETON_ID)
    if row is None:
        row = AuditCheckpoint(
            id=_SINGLETON_ID,
            through_id=through_id,
            entry_hash=entry_hash,
            signature=signature,
        )
        db.add(row)
    else:
        row.through_id = through_id
        row.entry_hash = entry_hash
        row.signature = signature
    db.commit()
    return row


def load_checkpoint(db: Session) -> CheckpointRecord | None:
    row = db.get(AuditCheckpoint, _SINGLETON_ID)
    if row is None:
        return None
    if not hmac.compare_digest(row.signature, _signature(row.through_id, row.entry_hash)):
        raise CheckpointError("audit checkpoint signature mismatch")
    return CheckpointRecord(through_id=row.through_id, entry_hash=row.entry_hash)
