import datetime
import uuid
from typing import Any

# from sqlalchemy.dialects.postgresql import import
from sqlmodel import Field
from sqlmodel import SQLModel as _SQLModel

from collections.abc import Mapping
from models import BaseModel


# unused: https://github.com/fastapi/sqlmodel/issues/59#issuecomment-2085514089
class SQLModel(BaseModel, _SQLModel):
    """Represents the base class for all models."""

    DISABLE_UPDATES = set(["id", "created_at"])

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime.datetime | None = Field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc),
    )
    updated_at: datetime.datetime | None = Field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc),
    )

    def update_model(self, model: BaseModel, update: Mapping[str, Any] = {}):
        super().update_model(model, update)
        self.updated_at = datetime.datetime.now(datetime.timezone.utc)
