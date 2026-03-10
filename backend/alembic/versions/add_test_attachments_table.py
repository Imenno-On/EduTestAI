"""Add test_attachments table

Revision ID: add_test_attachments
Revises: add_refresh_tokens_table
Create Date: 2026-03-10

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "add_test_attachments"
down_revision: Union[str, None] = "add_refresh_tokens_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "test_attachments",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("form_id", sa.Integer(), sa.ForeignKey("generated_forms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("s3_key", sa.String(500), nullable=False, unique=True),
        sa.Column("content_type", sa.String(100), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("test_attachments")
