from fastapi import status
from typing import ClassVar

from pydantic.dataclasses import dataclass
from pydantic import computed_field, Field
import http.client

from .base import BaseModel


class ValidationError(BaseModel):
    code: str = Field(validation_alias="type")
    message: str = Field(validation_alias="msg")
    path: list[str | int] = Field(validation_alias="loc")


class FormValidationError(BaseModel):
    form: dict[str, list[ValidationError]] = Field(default_factory=dict)
    fields: dict[str, list[ValidationError]] = Field(default_factory=dict)


@dataclass(kw_only=True)
class ServerException(Exception):
    STATUS_CODE: ClassVar[int] = status.HTTP_500_INTERNAL_SERVER_ERROR
    detail: str = ""

    def __post_init__(self):
        if not self.detail:
            self.detail = self.desc()

    @computed_field
    @property
    def code(self) -> int:
        return self.STATUS_CODE

    @computed_field
    @property
    def type(self) -> str:
        return self.__class__.__name__

    @classmethod
    def desc(cls) -> str:
        return http.client.responses.get(cls.STATUS_CODE, "Unknown Error")


@dataclass(kw_only=True)
class ServerBadRequestException(ServerException):
    STATUS_CODE: ClassVar[int] = status.HTTP_400_BAD_REQUEST


@dataclass(kw_only=True)
class ServerUnauthorizedException(ServerException):
    STATUS_CODE: ClassVar[int] = status.HTTP_401_UNAUTHORIZED


@dataclass(kw_only=True)
class ServerForbiddenException(ServerException):
    STATUS_CODE: ClassVar[int] = status.HTTP_403_FORBIDDEN


@dataclass(kw_only=True)
class ServerNotFoundException(ServerException):
    STATUS_CODE: ClassVar[int] = status.HTTP_404_NOT_FOUND


@dataclass(kw_only=True)
class ServerMethodNotAllowedException(ServerException):
    STATUS_CODE: ClassVar[int] = status.HTTP_405_METHOD_NOT_ALLOWED


@dataclass(kw_only=True)
class ServerValidationException(ServerException):
    STATUS_CODE: ClassVar[int] = status.HTTP_422_UNPROCESSABLE_CONTENT
    errors: FormValidationError = Field(default_factory=FormValidationError)
