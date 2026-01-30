"""Add active integration id to users

Revision ID: 4b6d0f9ac2f3
Revises: 5d1b9b1f0e2a
Create Date: 2025-07-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4b6d0f9ac2f3"
down_revision: Union[str, Sequence[str], None] = "5d1b9b1f0e2a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("users", sa.Column("active_integration_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_users_active_integration_id",
        "users",
        "platform_integrations",
        ["active_integration_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("fk_users_active_integration_id", "users", type_="foreignkey")
    op.drop_column("users", "active_integration_id")
