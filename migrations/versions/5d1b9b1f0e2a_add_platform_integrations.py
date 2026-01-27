"""Add platform integrations

Revision ID: 5d1b9b1f0e2a
Revises: 3a03c6120a38
Create Date: 2025-07-21 10:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5d1b9b1f0e2a"
down_revision: Union[str, Sequence[str], None] = "3a03c6120a38"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "platform_integrations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("credentials_encrypted", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_platform_integrations_user_id", "platform_integrations", ["user_id"])
    op.create_index("ix_platform_integrations_provider", "platform_integrations", ["provider"])
    op.create_index(
        "ix_platform_integrations_user_provider",
        "platform_integrations",
        ["user_id", "provider"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_platform_integrations_user_provider", table_name="platform_integrations")
    op.drop_index("ix_platform_integrations_provider", table_name="platform_integrations")
    op.drop_index("ix_platform_integrations_user_id", table_name="platform_integrations")
    op.drop_table("platform_integrations")
