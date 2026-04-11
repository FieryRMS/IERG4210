import http.client
import os
from typing import ClassVar

import dotenv
from fastapi import status
from pydantic import Field, computed_field
from pydantic.dataclasses import dataclass

dotenv.load_dotenv()  # Load environment variables from .env file


from .base import BaseModel

DEBUG = os.getenv("EXE_MODE", "prod") == "dev"


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
    message: str = ""

    def __post_init__(self):
        if not self.message:
            self.message = self.desc()
        super().__init__(self.message)

    @computed_field
    @property
    def code(self) -> int:
        return self.STATUS_CODE

    @computed_field
    @property
    def name(self) -> str:
        return self.__class__.__name__

    @computed_field
    @property
    def stack(self) -> str | None:
        if DEBUG:
            import traceback

            return "".join(
                traceback.format_exception(type(self), self, self.__traceback__)
            )
        return None

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
    message: str = "The requested resource has been permanently removed or does not exist."


@dataclass(kw_only=True)
class ServerMethodNotAllowedException(ServerException):
    STATUS_CODE: ClassVar[int] = status.HTTP_405_METHOD_NOT_ALLOWED


@dataclass(kw_only=True)
class ServerConflictException(ServerException):
    STATUS_CODE: ClassVar[int] = status.HTTP_409_CONFLICT


@dataclass(kw_only=True)
class ServerValidationException(ServerException):
    STATUS_CODE: ClassVar[int] = status.HTTP_422_UNPROCESSABLE_CONTENT
    errors: FormValidationError = Field(default_factory=FormValidationError)

    @computed_field
    @property
    def stack(self) -> str | None:
        stack = super().stack
        return f"{self.errors.model_dump_json(indent=2)}\n{stack}" if stack else None


__all__ = [
    "ServerException",
    "ServerBadRequestException",
    "ServerUnauthorizedException",
    "ServerForbiddenException",
    "ServerNotFoundException",
    "ServerMethodNotAllowedException",
    "ServerConflictException",
    "ServerValidationException",
]
