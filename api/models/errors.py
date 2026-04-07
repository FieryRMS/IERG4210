from fastapi import status
from typing import ClassVar

from pydantic.dataclasses import dataclass
from pydantic import computed_field, Field

from .base import BaseModel


@dataclass(kw_only=True)
class HTTPException(Exception):
    status_code: ClassVar[int] = status.HTTP_500_INTERNAL_SERVER_ERROR
    desc: ClassVar[str] = "Internal Server Error"

    @computed_field
    def type(self) -> str:
        return self.__class__.__name__

    @computed_field
    def msg(self) -> str:
        return self.desc


@dataclass(kw_only=True)
class HTTPNotFoundException(HTTPException):
    status_code: ClassVar[int] = status.HTTP_404_NOT_FOUND
    desc: ClassVar[str] = "Not Found"


@dataclass(kw_only=True)
class HTTPUnauthorizedException(HTTPException):
    status_code: ClassVar[int] = status.HTTP_401_UNAUTHORIZED
    desc: ClassVar[str] = "Unauthorized"


@dataclass(kw_only=True)
class HTTPForbiddenException(HTTPException):
    status_code: ClassVar[int] = status.HTTP_403_FORBIDDEN
    desc: ClassVar[str] = "Forbidden"


class ValidationError(BaseModel):
    code: str = Field(validation_alias="type")
    message: str = Field(validation_alias="msg")
    path: list[str | int] = Field(validation_alias="loc")


class FormValidationError(BaseModel):
    form: dict[str, list[ValidationError]]
    fields: dict[str, list[ValidationError]]


@dataclass(kw_only=True)
class HTTPValidationException(HTTPException):
    status_code: ClassVar[int] = status.HTTP_422_UNPROCESSABLE_ENTITY
    desc: ClassVar[str] = "Validation Error"
    errors: FormValidationError
