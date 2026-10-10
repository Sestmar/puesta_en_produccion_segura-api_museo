"""add is_active to users

Revision ID: f4b5c6d7e8a9
Revises: e2f1a3b4c5d6
Create Date: 2026-10-10 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4b5c6d7e8a9'
down_revision: Union[str, Sequence[str], None] = 'e2f1a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the account active flag; existing users are active."""
    op.add_column(
        'users',
        sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False),
    )


def downgrade() -> None:
    """Drop the account active flag."""
    op.drop_column('users', 'is_active')
