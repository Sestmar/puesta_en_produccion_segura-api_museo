"""add hash chain to audit logs

Revision ID: e2f1a3b4c5d6
Revises: d9f6b2a4c1e0
Create Date: 2026-10-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import select
from sqlalchemy.orm import Session


# revision identifiers, used by Alembic.
revision: str = 'e2f1a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'd9f6b2a4c1e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the tamper-evident hash chain columns and backfill existing rows."""
    op.add_column(
        'audit_logs', sa.Column('prev_hash', sa.String(length=64), nullable=True)
    )
    op.add_column(
        'audit_logs', sa.Column('entry_hash', sa.String(length=64), nullable=True)
    )
    op.create_index(
        op.f('ix_audit_logs_entry_hash'), 'audit_logs', ['entry_hash'], unique=False
    )
    _backfill()
    with op.batch_alter_table('audit_logs') as batch_op:
        batch_op.alter_column(
            'entry_hash', existing_type=sa.String(length=64), nullable=False
        )


def downgrade() -> None:
    """Drop the hash chain columns."""
    op.drop_index(op.f('ix_audit_logs_entry_hash'), table_name='audit_logs')
    op.drop_column('audit_logs', 'entry_hash')
    op.drop_column('audit_logs', 'prev_hash')


def _backfill() -> None:
    """Link pre-existing rows into the chain using the current key."""
    from app.audit import hash_audit_entry
    from app.models import AuditLog

    session = Session(bind=op.get_bind())
    try:
        prev_hash = None
        for row in session.scalars(select(AuditLog).order_by(AuditLog.id)).all():
            entry_hash = hash_audit_entry(
                created_at=row.created_at,
                action=row.action,
                actor=row.actor,
                resource_type=row.resource_type,
                resource_id=row.resource_id,
                details=row.details,
                ip_address=row.ip_address,
                user_agent=row.user_agent,
                request_id=row.request_id,
                prev_hash=prev_hash,
            )
            row.prev_hash = prev_hash
            row.entry_hash = entry_hash
            prev_hash = entry_hash
        session.flush()
    finally:
        session.close()
