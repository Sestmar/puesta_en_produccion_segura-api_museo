"""add Google OAuth identity columns to users

Revision ID: b7f3c1d9e2a4
Revises: d5a7b9c1e3f2
Create Date: 2026-10-22 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7f3c1d9e2a4'
down_revision: Union[str, Sequence[str], None] = 'd5a7b9c1e3f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """OAuth accounts have no password and store the provider identity."""
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column(
            'hashed_password', existing_type=sa.String(128), nullable=True
        )
        batch_op.add_column(sa.Column('email', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('oauth_provider', sa.String(20), nullable=True))
        batch_op.add_column(sa.Column('oauth_subject', sa.String(255), nullable=True))


def downgrade() -> None:
    """Drop the OAuth columns and require a password again.

    OAuth-only rows cannot satisfy the NOT NULL constraint, so they are deleted
    before restoring it.
    """
    op.execute("DELETE FROM users WHERE hashed_password IS NULL")
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('oauth_subject')
        batch_op.drop_column('oauth_provider')
        batch_op.drop_column('email')
        batch_op.alter_column(
            'hashed_password', existing_type=sa.String(128), nullable=False
        )
