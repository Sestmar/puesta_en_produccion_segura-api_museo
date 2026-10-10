"""add audit_checkpoints table

Revision ID: a7c8d9e0f1a2
Revises: f4b5c6d7e8a9
Create Date: 2026-10-10 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7c8d9e0f1a2'
down_revision: Union[str, Sequence[str], None] = 'f4b5c6d7e8a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the signed audit-chain checkpoint used by retention."""
    op.create_table(
        'audit_checkpoints',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('through_id', sa.Integer(), nullable=False),
        sa.Column('entry_hash', sa.String(length=64), nullable=False),
        sa.Column('signature', sa.String(length=64), nullable=False),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    """Drop the audit-chain checkpoint table."""
    op.drop_table('audit_checkpoints')
