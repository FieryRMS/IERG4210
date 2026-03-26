import datetime
import uuid
from typing import ClassVar, Any

# from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Field
from sqlmodel import SQLModel as _SQLModel
from collections.abc import Mapping

from models import BaseModel


# https://github.com/fastapi/sqlmodel/issues/59#issuecomment-2085514089
class SQLModel(BaseModel, _SQLModel):
    """Represents the base class for all models."""

    # Specifies the set of index elements which represent the ON CONFLICT target
    UPSERT_INDEX_ELEMENTS: ClassVar[set[str]] = set(["id"])

    # Specifies the set of fields to exclude from updating in the resulting
    # UPSERT statement
    UPSERT_EXCLUDE_FIELDS: ClassVar[set[str]] = set()

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime.datetime | None = Field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc),
    )
    updated_at: datetime.datetime | None = Field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc),
    )

    # unused for now
    # def upsert(self):
    #     """Returns an UPSERT statement"""
    #     exclude_fields = self.UPSERT_EXCLUDE_FIELDS.copy()

    #     # Common fields which we should exclude when updating.
    #     exclude_fields.add("id")
    #     exclude_fields.add("created_at")

    #     # Dump the model and exclude the specified fields during update.
    #     obj_dict = self.model_dump()
    #     to_update = obj_dict.copy()
    #     for field in exclude_fields:
    #         _ = to_update.pop(field, None)

    #     stmt = insert(self.__class__).values(obj_dict)
    #     stmt = stmt.on_conflict_do_update(
    #         index_elements=self.UPSERT_INDEX_ELEMENTS,
    #         set_=to_update,
    #     )

    #     return stmt

    def update_model(self, model: BaseModel, update: Mapping[str, Any] = {}):
        updated = self.model_copy(
            update={**model.model_dump(exclude_unset=True), **update}
        )
        for field in model.model_fields_set | set(update):
            if hasattr(self, field) and field not in self.UPSERT_EXCLUDE_FIELDS:
                setattr(self, field, getattr(updated, field))
        self.updated_at = datetime.datetime.now(datetime.timezone.utc)
