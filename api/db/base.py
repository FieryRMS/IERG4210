from datetime import datetime, timezone
import uuid
from typing import Any

# from sqlalchemy.dialects.postgresql import import
from sqlmodel import Field
from sqlmodel import SQLModel as _SQLModel, DateTime

from collections.abc import Mapping
from models import BaseModel


# unused: https://github.com/fastapi/sqlmodel/issues/59#issuecomment-2085514089
class SQLModel(BaseModel, _SQLModel):
    """Represents the base class for all models."""

    DISABLE_UPDATES = set(["id", "created_at"])

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    created_at: datetime = Field(
        sa_type=DateTime(timezone=True),  # pyright: ignore[reportArgumentType]
        default_factory=lambda: datetime.now(timezone.utc),
    )
    updated_at: datetime = Field(
        sa_type=DateTime(timezone=True),  # pyright: ignore[reportArgumentType]
        default_factory=lambda: datetime.now(timezone.utc),
    )

    def update_model(self, model: BaseModel, update: Mapping[str, Any] = {}):
        super().update_model(model, update)
        self.updated_at = datetime.now(timezone.utc)
