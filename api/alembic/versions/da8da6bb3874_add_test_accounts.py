# pyright: reportUnusedImport=false, reportArgumentType=false
"""add test accounts

Revision ID: da8da6bb3874
Revises: ff22f393231f
Create Date: 2026-03-28 15:09:54.230395+00:00

"""

from collections.abc import Sequence
import uuid

from alembic import op
import sqlalchemy as sa
import sqlmodel
import sqlmodel.sql.sqltypes
from datetime import datetime, timezone

# revision identifiers, used by Alembic.
revision: str = "da8da6bb3874"
down_revision: str | Sequence[str] | None = "ff22f393231f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    from argon2 import PasswordHasher

    password_hash = PasswordHasher().hash("Admin!@#123")
    op.execute(
        sa.text(
            "INSERT INTO users (id, created_at, updated_at, email, username, password_hash, role) "
            "VALUES (:id, :created_at, :updated_at, :email, :username, :password_hash, :role)"
        ).bindparams(
            id=str(uuid.uuid4()),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            email="testadmin@testadmin.com",
            username="testadmin",
            password_hash=password_hash,
            role="admin",
        )
    )

    password_hash = PasswordHasher().hash("User!@#123")
    op.execute(
        sa.text(
            "INSERT INTO users (id, created_at, updated_at, email, username, password_hash, role) "
            "VALUES (:id, :created_at, :updated_at, :email, :username, :password_hash, :role)"
        ).bindparams(
            id=str(uuid.uuid4()),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            email="testuser@testuser.com",
            username="testuser",
            password_hash=password_hash,
            role="user",
        )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        sa.text(
            "DELETE FROM users WHERE username = :username AND email = :email"
        ).bindparams(username="testadmin", email="testadmin@testadmin.com")
    )
    op.execute(
        sa.text(
            "DELETE FROM users WHERE username = :username AND email = :email"
        ).bindparams(username="testuser", email="testuser@testuser.com")
    )
