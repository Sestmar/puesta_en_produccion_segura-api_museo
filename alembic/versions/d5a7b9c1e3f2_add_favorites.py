"""add favorites table

Revision ID: d5a7b9c1e3f2
Revises: c3e8f1a9b2d4
Create Date: 2026-10-15 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5a7b9c1e3f2'
down_revision: Union[str, Sequence[str], None] = 'c3e8f1a9b2d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Per-user saved artworks; the composite key makes saving idempotent."""
    op.create_table(
        'favorites',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('artwork_id', sa.Integer(), nullable=False),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['artwork_id'], ['artworks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'artwork_id'),
    )
    op.create_index(
        op.f('ix_favorites_artwork_id'), 'favorites', ['artwork_id'], unique=False
    )


def downgrade() -> None:
    """Drop the favorites table."""
    op.drop_index(op.f('ix_favorites_artwork_id'), table_name='favorites')
    op.drop_table('favorites')
