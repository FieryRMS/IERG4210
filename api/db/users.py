import enum
import uuid

from argon2.exceptions import VerificationError
from argon2 import PasswordHasher
from pydantic import EmailStr, field_validator
from sqlmodel import Field, Relationship
from pydantic_partial import PartialModelMixin

from db.base import SQLModel
from models import BaseModel
import secrets
import os
from typing import TypedDict, NotRequired, Literal
from datetime import datetime, timezone


class CookieSettings(TypedDict):
    key: str
    max_age: int
    expires: NotRequired[datetime | str | int | None]
    path: NotRequired[str | None]
    domain: NotRequired[str | None]
    secure: NotRequired[bool]
    httponly: NotRequired[bool]
    samesite: NotRequired[Literal["lax", "strict", "none"] | None]
    partitioned: NotRequired[bool]


SESSION_COOKIE_SETTINGS = CookieSettings(
    key="__Host-session" if os.getenv("API_MODE") != "dev" else "session",
    secure=os.getenv("API_MODE") != "dev",
    httponly=True,
    samesite="lax",
    path="/",
    max_age=60 * 60 * 24 * 7,  # 7 days
)

_ph = PasswordHasher()


class Role(str, enum.Enum):
    admin = "admin"
    user = "user"


class _User(BaseModel):
    email: EmailStr = Field(unique=True)
    username: str = Field(unique=True)
    role: Role = Role.user


class UserCreate(_User, PartialModelMixin):
    password: str


class UserUpdate(UserCreate.as_partial(), BaseModel):
    pass


class UserLogin(BaseModel):
    identifier: str  # email or username
    password: str


class User(_User, SQLModel, table=True):
    __tablename__ = "users"  # pyright: ignore[reportAssignmentType]

    password_hash: str = Field(exclude=True, validation_alias="password")
    sessions: list["Session"] = Relationship(back_populates="user", cascade_delete=True)

    @field_validator("password_hash", mode="after")
    @classmethod
    def hash_password(cls, v: str) -> str:
        return _ph.hash(v)

    def verify_password(self, password: str) -> bool:
        try:
            return _ph.verify(self.password_hash, password)
        except VerificationError:
            return False


class Session(SQLModel, table=True):
    __tablename__ = "sessions"  # pyright: ignore[reportAssignmentType]

    user_id: uuid.UUID = Field(foreign_key="users.id")
    token: str = Field(unique=True, default_factory=lambda: secrets.token_urlsafe(32))
    max_age: int = SESSION_COOKIE_SETTINGS["max_age"]

    user: User = Relationship(back_populates="sessions")

    def is_expired(self) -> bool:
        return self.created_at is not None and (
            datetime.now(timezone.utc) - self.created_at
        ).total_seconds() > self.max_age