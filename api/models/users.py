import enum
import secrets
import uuid
from datetime import datetime, timezone
from functools import cached_property
from typing import TYPE_CHECKING, Annotated

import requests
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from pydantic import EmailStr
from pydantic import Field as PydanticField
from pydantic import computed_field
from pydantic_partial import PartialModelMixin
from sqlmodel import Field, Relationship
from sqlmodel import Session as DBSession
from sqlmodel import delete, func

from .base import BaseModel, SQLModel

if TYPE_CHECKING:
    from .orders import Transaction

_ph = PasswordHasher()

Password = Annotated[
    str,
    PydanticField(
        min_length=8,
        max_length=128,
        pattern=r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).*",
    ),
]


class Role(str, enum.Enum):
    admin = "admin"
    user = "user"


class _User(BaseModel):
    username: str = Field(unique=True)
    email: EmailStr = Field(unique=True)
    role: Role = Role.user
    verified: bool = Field(default=False)


class UserCreate(_User, PartialModelMixin):
    password: Password



class UserUpdate(UserCreate.as_partial(), BaseModel):
    id: uuid.UUID
    pass


class UserLogin(BaseModel):
    username: str  # email or username
    password: Password

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: Password

class UserChangePassword(BaseModel):
    old_password: str
    password: Password


class User(_User, SQLModel, table=True):
    __tablename__ = "users"  # pyright: ignore[reportAssignmentType]

    role: Role = Role.user
    password_hash: str = Field(exclude=True, default="")
    sessions: list["Session"] = Relationship(back_populates="user", cascade_delete=True)
    transactions: list["Transaction"] = Relationship(back_populates="user")

    @computed_field(alias="sessions")
    @property
    def _sessions(self) -> list["Session"]:
        return self.sessions

    def set_password(self, password: str):
        self.password_hash = _ph.hash(password)

    def verify_password(self, password: str) -> bool:
        try:
            return _ph.verify(self.password_hash, password)
        except VerificationError:
            return False

    # just to satisfy typescript
    @computed_field(alias="password")
    def _password(self) -> str:
        return ""


class Session(SQLModel, table=True):
    __tablename__ = "sessions"  # pyright: ignore[reportAssignmentType]

    user_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE")
    token: str = Field(
        unique=True, default_factory=lambda: secrets.token_urlsafe(32), exclude=True
    )
    max_age: int = 60 * 60 * 24 * 2  # 2 days in seconds
    ip_address: str | None = Field(default=None)
    user_agent: str | None = Field(default=None)

    user: User = Relationship(back_populates="sessions")

    def is_expired(self) -> bool:
        return (
            datetime.now(timezone.utc) - self.created_at
        ).total_seconds() > self.max_age

    @classmethod
    def delete_expired(cls, db: DBSession) -> int:
        """Bulk-delete all expired sessions in one SQL statement.

        Returns the number of rows deleted.

        Equivalent pg_cron job (run once to register, requires pg_cron extension):
            SELECT cron.schedule(
                'delete-expired-sessions',
                '0 * * * *',
                $$DELETE FROM sessions
                  WHERE created_at + (max_age * interval '1 second') < NOW()$$
            );
        """
        result = db.exec(delete(Session).where(
            Session.created_at + func.make_interval(secs=Session.max_age) < func.now()
        ))
        db.commit()
        return result.rowcount

    @computed_field()
    @cached_property
    def location(self) -> None | str:
        if self.ip_address is None:
            return None
        try:
            response = requests.get(f"https://ipapi.co/{self.ip_address}/json/")
            response.raise_for_status()
            data = response.json()
            city = data.get("city")
            region = data.get("region")
            country = data.get("country_name")
            return ", ".join(filter(None, [city, region, country]))
        except Exception:
            return None


__all__ = [
    "User",
    "Session",
    "UserCreate",
    "UserUpdate",
    "UserLogin",
    "UserRegister",
    "UserChangePassword",
    "Role",
]
