"""add login lockout to users

Revision ID: 7c4e9a1d2b3f
Revises: 29aad439e903
Create Date: 2026-10-09 17:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c4e9a1d2b3f'
down_revision: Union[str, Sequence[str], None] = '29aad439e903'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'users',
        sa.Column('failed_login_attempts', sa.Integer(), server_default='0', nullable=False),
    )
    op.add_column(
        'users',
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'locked_until')
    op.drop_column('users', 'failed_login_attempts')