import enum
import uuid

from argon2.exceptions import VerificationError
from argon2 import PasswordHasher
from pydantic import EmailStr, computed_field, Field as PydanticField
from sqlmodel import Field, Relationship
from pydantic_partial import PartialModelMixin

from db.base import SQLModel
from models import BaseModel
import secrets
from datetime import datetime, timezone

_ph = PasswordHasher()


class Role(str, enum.Enum):
    admin = "admin"
    user = "user"


class _User(BaseModel):
    username: str = Field(unique=True)
    email: EmailStr = Field(unique=True)


class PasswordMixin(BaseModel):
    password: str = PydanticField(
        min_length=8,
        max_length=128,
        pattern=r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).*",
    )


class UserCreate(PasswordMixin, _User, PartialModelMixin):
    pass


class UserUpdate(UserCreate.as_partial(), BaseModel):
    id: uuid.UUID
    role: Role = Role.user
    pass


class _UsernameMixin(BaseModel):  # for ordering
    username: str  # email or username


class UserLogin(PasswordMixin, _UsernameMixin):
    pass


class _OldPasswordMixin(BaseModel):  # for ordering
    old_password: str


class UserChangePassword(PasswordMixin, _OldPasswordMixin):
    pass


class User(_User, SQLModel, table=True):
    __tablename__ = "users"  # pyright: ignore[reportAssignmentType]

    role: Role = Role.user
    password_hash: str = Field(exclude=True, default="")
    sessions: list["Session"] = Relationship(
        back_populates="user",
        cascade_delete=True,
        sa_relationship_kwargs={"lazy": "selectin"},
    )

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
    token: str = Field(unique=True, default_factory=lambda: secrets.token_urlsafe(32), exclude=True)
    max_age: int = 60 * 60 * 24 * 2  # 2 days in seconds

    user: User = Relationship(back_populates="sessions")

    def is_expired(self) -> bool:
        return (
            datetime.now(timezone.utc) - self.created_at
        ).total_seconds() > self.max_age
