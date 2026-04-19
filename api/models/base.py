import uuid
from collections.abc import Mapping
from datetime import datetime, timezone
from typing import Any, ClassVar

from pydantic import AliasChoices, AliasPath
from pydantic import BaseModel as _BaseModel
from pydantic import ConfigDict
from pydantic_core import PydanticUndefined
from sqlalchemy.sql.functions import GenericFunction
from sqlmodel import DateTime, Field
from sqlmodel import SQLModel as _SQLModel


class make_interval(GenericFunction[DateTime]):
    def __init__(
        self,
        years: int = 0,
        months: int = 0,
        weeks: int = 0,
        days: int = 0,
        hours: int = 0,
        mins: int = 0,
        secs: int = 0,
        **kw: Any,
    ):
        super().__init__(years, months, weeks, days, hours, mins, secs, **kw)


class BaseModel(_BaseModel):
    model_config = ConfigDict(
        from_attributes=True, validate_assignment=True, regex_engine="python-re"
    )
    DISABLE_UPDATES: ClassVar[set[str]]

    def update_model(self, model: BaseModel, update: Mapping[str, Any] = {}):
        merged = {**model.model_dump(exclude_unset=True), **update}
        updated_fields: set[str] = set()

        for name, field in type(self).model_fields.items():
            if name in self.DISABLE_UPDATES:
                continue

            value: Any = PydanticUndefined

            if field.alias is not None and field.alias in merged:
                value = merged[field.alias]

            if value is PydanticUndefined and field.validation_alias is not None:
                aliases = (
                    field.validation_alias.choices
                    if isinstance(field.validation_alias, AliasChoices)
                    else [field.validation_alias]
                )
                for alias in aliases:
                    if isinstance(alias, str) and alias in merged:
                        value = merged[alias]
                        break
                    elif isinstance(alias, AliasPath):
                        v = alias.search_dict_for_path(  # pyright: ignore[reportUnknownMemberType]
                            merged
                        )
                        if v is not PydanticUndefined:
                            value = v
                            break

            if value is PydanticUndefined and name in merged:
                value = merged[name]

            if value is not PydanticUndefined:
                setattr(self, name, value)
                updated_fields.add(name)

        for name in update.keys():
            if (
                name not in updated_fields
                and name not in self.DISABLE_UPDATES
                and hasattr(self, name)
            ):
                setattr(self, name, update[name])


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


__all__ = ["BaseModel", "SQLModel"]
