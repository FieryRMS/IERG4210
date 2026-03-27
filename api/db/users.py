import datetime
import enum
import uuid

from pydantic import EmailStr
from sqlmodel import Field, Relationship
from pydantic_partial import  PartialModelMixin

from db.base import SQLModel
from models import BaseModel


class Role(str, enum.Enum):
    admin = "admin"
    user = "user"


class _User(BaseModel):
    email: EmailStr
    username: str
    role: Role = Role.user


class UserCreate(_User, PartialModelMixin):
    password: str

class UserUpdate(UserCreate.as_partial(), BaseModel):
    pass

class User(_User, SQLModel, table=True):
    __tablename__ = "users"  # pyright: ignore[reportAssignmentType]

    password_hash: str = Field(exclude=True)
    sessions: list["Session"] = Relationship(back_populates="user", cascade_delete=True)


class Session(SQLModel, table=True):
    __tablename__ = "sessions"  # pyright: ignore[reportAssignmentType]

    user_id: uuid.UUID = Field(foreign_key="users.id")
    token: str = Field(unique=True)
    expires_at: datetime.datetime

    user: User = Relationship(back_populates="sessions")
