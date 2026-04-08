from pydantic import AliasChoices, AliasPath
from pydantic import BaseModel as _BaseModel
from pydantic import ConfigDict
from pydantic_core import PydanticUndefined
from collections.abc import Mapping
from typing import Any, ClassVar


class BaseModel(_BaseModel):
    model_config = ConfigDict(from_attributes=True, validate_assignment=True, regex_engine='python-re')
    DISABLE_UPDATES: ClassVar[set[str]]

    def update_model(self, model: BaseModel, update: Mapping[str, Any] = {}):
        merged = {**model.model_dump(exclude_unset=True), **update}

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
