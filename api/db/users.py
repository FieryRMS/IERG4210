import enum
import uuid

import re

from argon2.exceptions import VerificationError
from argon2 import PasswordHasher
from pydantic import EmailStr, StringConstraints
from pydantic.functional_validators import AfterValidator
from typing import Annotated
from sqlmodel import Field, Relationship
from pydantic_partial import PartialModelMixin

from db.base import SQLModel
from models import BaseModel
import secrets
from datetime import datetime, timezone

_ph = PasswordHasher()


def _validate_password(v: str) -> str:
    if not re.search(r"[A-Z]", v):
        raise ValueError("Must contain at least one uppercase letter")
    if not re.search(r"[a-z]", v):
        raise ValueError("Must contain at least one lowercase letter")
    if not re.search(r"[0-9]", v):
        raise ValueError("Must contain at least one number")
    if not re.search(r"[^A-Za-z0-9]", v):
        raise ValueError("Must contain at least one special character")
    return v


PasswordStr = Annotated[
    str,
    StringConstraints(min_length=8, max_length=100),
    AfterValidator(_validate_password),
]


class Role(str, enum.Enum):
    admin = "admin"
    user = "user"


class _User(BaseModel):
    email: EmailStr = Field(unique=True)
    username: str = Field(unique=True)


class UserCreate(PartialModelMixin, _User):
    password: PasswordStr


class UserUpdate(UserCreate.as_partial(), BaseModel):
    role: Role = Role.user
    pass


class UserLogin(BaseModel):
    username: str  # email or username
    password: str


class UserChangePassword(BaseModel):
    old_password: str
    password: PasswordStr


class User(_User, SQLModel, table=True):
    __tablename__ = "users"  # pyright: ignore[reportAssignmentType]

    role: Role = Role.user
    password_hash: str = Field(exclude=True, default="")
    sessions: list["Session"] = Relationship(back_populates="user", cascade_delete=True)

    def set_password(self, password: str) -> None:
        self.password_hash = _ph.hash(password)

    def verify_password(self, password: str) -> bool:
        try:
            return _ph.verify(self.password_hash, password)
        except VerificationError:
            return False


class Session(SQLModel, table=True):
    __tablename__ = "sessions"  # pyright: ignore[reportAssignmentType]

    user_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE")
    token: str = Field(unique=True, default_factory=lambda: secrets.token_urlsafe(32))
    max_age: int = 60 * 60 * 24 * 2  # 2 days in seconds

    user: User = Relationship(back_populates="sessions")

    def is_expired(self) -> bool:
        return (
            datetime.now(timezone.utc) - self.created_at
        ).total_seconds() > self.max_age
