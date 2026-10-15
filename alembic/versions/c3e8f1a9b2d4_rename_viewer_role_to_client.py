"""rename viewer role to client and introduce manager

Revision ID: c3e8f1a9b2d4
Revises: a7c8d9e0f1a2
Create Date: 2026-10-15 15:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3e8f1a9b2d4'
down_revision: Union[str, Sequence[str], None] = 'a7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

users = sa.table('users', sa.column('role', sa.String))


def upgrade() -> None:
    """Existing read-only users become clients; manager needs no data change."""
    op.execute(users.update().where(users.c.role == 'viewer').values(role='client'))


def downgrade() -> None:
    """The previous schema only knew admin/viewer: fold both new roles into viewer."""
    op.execute(
        users.update()
        .where(users.c.role.in_(['client', 'manager']))
        .values(role='viewer')
    )
