"""Merge Alembic heads for container startup

Revision ID: merge_heads_20260406
Revises: 5e1e559bc272, add_test_attachments
Create Date: 2026-04-06
"""

from typing import Sequence, Union


revision: str = "merge_heads_20260406"
down_revision: Union[str, Sequence[str], None] = (
    "5e1e559bc272",
    "add_test_attachments",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge two migration branches without schema changes."""
    pass


def downgrade() -> None:
    """Unmerge migration branches without schema changes."""
    pass
