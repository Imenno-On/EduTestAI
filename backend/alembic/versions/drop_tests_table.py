"""drop_tests_table

Revision ID: drop_tests_table
Revises: add_role_to_users
Create Date: 2025-02-28

Удаление таблицы tests (ручные тесты). В проекте остаются только
сгенерированные ИИ тесты (generated_forms).
"""
from typing import Sequence, Union

from alembic import op


revision: str = "drop_tests_table"
down_revision: Union[str, Sequence[str], None] = "add_role_to_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("tests")


def downgrade() -> None:
    import sqlalchemy as sa
    op.create_table(
        "tests",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
    )
