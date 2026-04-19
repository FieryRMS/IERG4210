import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timezone
from typing import ClassVar

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
    token_hash: str = Field(exclude=True, default="")
    timeout: ClassVar[int] = 5 * 60  # 5 minutes between requests

    def is_expired(self, max_age: int) -> bool:
        return (datetime.now(timezone.utc) - self.created_at).total_seconds() > max_age

    def within_timeout(self) -> bool:
        """Returns True if the token was created recently enough that a new one should not be issued."""
        return (datetime.now(timezone.utc) - self.created_at).total_seconds() < self.timeout

    def generate_token(self) -> str:
        token = secrets.token_urlsafe(32)
        self.set_token(token)
        return token

    def set_token(self, token: str):
        self.token_hash = hashlib.sha256(token.encode()).hexdigest()

    def verify_token(self, token: str) -> bool:
        expected = hashlib.sha256(token.encode()).hexdigest()
        return hmac.compare_digest(expected, self.token_hash)


class PasswordResetToken(_TokenMixin, table=True):
    __tablename__ = "password_reset_tokens"  # pyright: ignore[reportAssignmentType]

    max_age: ClassVar[int] = 60 * 60  # 1 hour

    user: User = Relationship()


class EmailVerificationToken(_TokenMixin, table=True):
    __tablename__ = "email_verification_tokens"  # pyright: ignore[reportAssignmentType]

    max_age: ClassVar[int] = 60 * 60 * 24  # 24 hours

    user: User = Relationship()


__all__ = [
    "PasswordResetToken",
    "EmailVerificationToken",
    "ForgotPassword",
    "ResetPassword",
    "VerifyEmail",
]
