"""add_role_column_to_users

Revision ID: add_role_to_users
Revises: 1433cbe5e50b
Create Date: 2025-01-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_role_to_users'
down_revision: Union[str, Sequence[str], None] = '1433cbe5e50b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Добавляем колонку role с дефолтным значением 'user'
    op.add_column('users', sa.Column('role', sa.String(50), nullable=False, server_default='user'))
    
    # Обновляем существующих суперпользователей на роль admin
    op.execute("UPDATE users SET role = 'admin' WHERE is_superuser = true")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'role')

