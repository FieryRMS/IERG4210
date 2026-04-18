import secrets
import uuid
from datetime import datetime, timezone

from pydantic import EmailStr
from sqlmodel import Field, Relationship

from .base import BaseModel, SQLModel
from .users import Password, User


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    id: uuid.UUID
    token: str
    password: Password


class VerifyEmail(BaseModel):
    id: uuid.UUID
    token: str


class _TokenMixin(SQLModel):
    user_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE")
    token: str = Field(
        unique=True,
        default_factory=lambda: secrets.token_urlsafe(32),
        exclude=True,
    )

    def is_expired(self, max_age: int) -> bool:
        return (datetime.now(timezone.utc) - self.created_at).total_seconds() > max_age


class PasswordResetToken(_TokenMixin, table=True):
    __tablename__ = "password_reset_tokens"  # pyright: ignore[reportAssignmentType]

    max_age: int = Field(default=60 * 60)  # 1 hour

    user: User = Relationship()


class EmailVerificationToken(_TokenMixin, table=True):
    __tablename__ = "email_verification_tokens"  # pyright: ignore[reportAssignmentType]

    max_age: int = Field(default=60 * 60 * 24)  # 24 hours

    user: User = Relationship()


__all__ = [
    "PasswordResetToken",
    "EmailVerificationToken",
    "ForgotPassword",
    "ResetPassword",
    "VerifyEmail",
]
