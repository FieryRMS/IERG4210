import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated
from urllib.parse import quote

import httpx
from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.security import APIKeyHeader
from fastapi_decorators import depends
from limiter import limiter
from models import (
    EmailVerificationToken,
    ForgotPassword,
    PasswordResetToken,
    ResetPassword,
    Role,
    ServerBadRequestException,
    ServerForbiddenException,
    ServerNotFoundException,
    ServerTooManyRequestsException,
    ServerUnauthorizedException,
)
from models import Session as UserSession
from models import (
    State,
    User,
    UserChangePassword,
    UserCreate,
    UserLogin,
    UserRegister,
    UserUpdate,
    VerifyEmail,
)
from routes.common import render_email, send_email
from slowapi.util import get_remote_address
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

WEB_URL = os.environ.get("WEB_URL", "")

router = APIRouter(prefix="/users", tags=["Users"])

_session_scheme = APIKeyHeader(
    name="X-Session-Token",
    auto_error=False,
    scheme_name="SessionToken",
    description="A token that represents the user's session. It should be included in the request header with the name 'X-Session-Token'.",
)


async def _get_location_from_ip(ip: str | None, state: State) -> str | None:
    redis = state["redis"]
    if ip is None or ip.startswith("127.") or ip == "localhost":
        return None
    redis_key = f"ip_location:{ip}"
    cached_location: str | None = await redis.get(redis_key)
    if cached_location is not None:
        return cached_location
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"https://free.freeipapi.com/api/json/{ip}")
            response.raise_for_status()
            data = response.json()
        if data.get("ipVersion") == None:
            return None
        city = data.get("cityName")
        region = data.get("regionName")
        country = data.get("countryName")
        location = ", ".join(filter(None, [city, region, country]))
        await redis.setex(redis_key, 7 * 24 * 60 * 60, location)  # Cache for 7 days
        return location
    except Exception:
        return None


async def _is_disposable_email(email: str, state: State) -> bool:
    domain = email.split("@")[-1].lower()
    return bool(await state["redis"].bf().exists("bloom:disposable_domains", domain)) # pyright: ignore[reportUnknownArgumentType, reportUnknownMemberType] # fmt: skip


def _set_session_headers(response: Response, user_session: UserSession | None):
    expires = (
        user_session.created_at + timedelta(seconds=user_session.max_age)
        if user_session
        else datetime.now(timezone.utc)
    ).strftime("%a, %d %b %Y %H:%M:%S GMT")
    response.headers[_session_scheme.model.name] = (
        f"{user_session.token if user_session else ''}#{expires}"
    )


def with_session(*, inject: bool = True):
    def dependency(
        request: Request,
        token: Annotated[str | None, Depends(_session_scheme)] = None,
    ) -> None | UserSession:
        state: State = request.state  # pyright: ignore[reportAssignmentType]
        if not token:
            return None

        session = state["session"]
        user_session = session.exec(
            select(UserSession).where(UserSession.token == token)
        ).first()
        if not user_session:
            return None
        if user_session.is_expired():
            session.delete(user_session)
            session.commit()
            return None
        return user_session

    if not inject:
        return depends(dependency)

    return depends(session=dependency)


def with_user(*, roles: list[Role] = [], inject: bool | None = None):
    """
    by default(inject=None) injects if roles are not defined.
    """

    @with_session()
    def dependency(session: UserSession | None) -> User:
        if session is None:
            raise ServerUnauthorizedException
        if len(roles) > 0 and session.user.role.value not in roles:
            raise ServerForbiddenException
        return session.user

    if inject == None:
        inject = len(roles) == 0

    if not inject:
        return depends(dependency)
    return depends(user=dependency)


@router.get("/me", status_code=status.HTTP_200_OK)
@with_session()
async def get_current_user(
    request: Request, session: UserSession | None
) -> User | None:
    if session is None:
        return None
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    UserSession.delete_expired(state["session"])
    return session.user


@router.post("/me", status_code=status.HTTP_200_OK)
@limiter.limit("20/minute") # pyright: ignore[reportUntypedFunctionDecorator, reportUnknownMemberType] # fmt: skip
async def login(request: Request, response: Response, credentials: UserLogin) -> User:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    try:
        validate_email(credentials.username)
        db_user = session.exec(
            select(User).where(User.email == credentials.username)
        ).first()
    except EmailNotValidError:
        db_user = session.exec(
            select(User).where(User.username == credentials.username)
        ).first()
    if (
        not db_user
        or not db_user.verify_password(credentials.password)
        or not db_user.verified
    ):
        raise ServerUnauthorizedException(
            message="Invalid username/email or password. If you registered recently, please verify your email first."
        )

    ip = get_remote_address(request)
    user_session = UserSession(
        user_id=db_user.id,
        ip_address=ip,
        user_agent=request.headers.get("x-forwarded-user-agent"),
        location=await _get_location_from_ip(ip, state),
    )
    session.add(user_session)
    session.commit()
    session.refresh(db_user)

    _set_session_headers(response, user_session)
    return db_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
@with_session()
async def logout(request: Request, response: Response, session: UserSession | None):
    if session is None:
        return
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    db_session.delete(session)
    db_session.commit()
    _set_session_headers(response, None)


@router.delete("/me/sessions/{id}", status_code=status.HTTP_204_NO_CONTENT)
@with_user()
async def delete_own_session(request: Request, id: uuid.UUID, user: User):
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    user_session = db_session.get(UserSession, id)
    if not user_session or user_session.user_id != user.id:
        raise ServerNotFoundException
    db_session.delete(user_session)
    db_session.commit()


async def _send_verification_email(
    db_user: User, verification_token: EmailVerificationToken, raw_token: str
) -> None:
    verify_url = f"{WEB_URL}/verify-email?id={verification_token.id}&token={raw_token}"
    html = render_email(
        "email_action.html",
        username=db_user.username,
        title="Verify your email address",
        body="click the button below to verify your email address and activate your account. This link expires in 24 hours.",
        action_url=verify_url,
        action_label="Verify email",
        footer="If you didn't create an account, you can safely ignore this email.",
    )
    await send_email(db_user.email, "Verify your email address", html)


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute") # pyright: ignore[reportUntypedFunctionDecorator, reportUnknownMemberType] # fmt: skip
async def register(request: Request, user: UserRegister) -> User:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]

    # Check if the exact same username+email already exists and is unverified → resend
    existing = session.exec(
        select(User).where(User.email == user.email, User.username == user.username)
    ).first()
    if existing:
        if existing.verified:
            raise ServerBadRequestException(message="Email is already registered")
        existing_token = session.exec(
            select(EmailVerificationToken).where(
                EmailVerificationToken.user_id == existing.id
            )
        ).first()
        if existing_token:
            if existing_token.within_timeout():
                raise ServerTooManyRequestsException(
                    message="A verification email was already sent recently. Please wait a few minutes before trying again."
                )
            session.delete(existing_token)
            session.commit()
        verification_token = EmailVerificationToken(user_id=existing.id)
        raw_token = verification_token.generate_token()
        session.add(verification_token)
        session.commit()
        await _send_verification_email(existing, verification_token, raw_token)
        return existing

    db_user = User.model_validate(user)

    if await _is_disposable_email(db_user.email, state):
        raise ServerBadRequestException(message="This email address is not allowed")

    db_user.set_password(user.password)
    verification_token = EmailVerificationToken(user_id=db_user.id)
    raw_token = verification_token.generate_token()
    session.add(db_user)
    session.add(verification_token)
    try:
        session.commit()
    except IntegrityError as e:
        session.rollback()
        orig = str(e.orig).lower()
        if "uq_users_username" in orig:
            raise ServerBadRequestException(message="Username is already taken")
        if "uq_users_email" in orig:
            raise ServerBadRequestException(message="Email is already registered")
        raise ServerBadRequestException
    session.refresh(db_user)

    await _send_verification_email(db_user, verification_token, raw_token)
    return db_user


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute") # pyright: ignore[reportUntypedFunctionDecorator, reportUnknownMemberType] # fmt: skip
async def forgot_password(request: Request, body: ForgotPassword):
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    db_user = session.exec(select(User).where(User.email == body.email)).first()
    if not db_user:
        return

    existing_token = session.exec(
        select(PasswordResetToken).where(PasswordResetToken.user_id == db_user.id)
    ).first()
    if existing_token:
        if existing_token.within_timeout():
            raise ServerTooManyRequestsException(
                message="A password reset email was already sent recently. Please wait a few minutes before trying again."
            )
        session.delete(existing_token)
        session.commit()

    reset_token = PasswordResetToken(user_id=db_user.id)
    raw_token = reset_token.generate_token()
    session.add(reset_token)
    session.commit()

    reset_url = f"{WEB_URL}/reset-password?id={reset_token.id}&token={raw_token}&email={quote(db_user.email, safe='')}"
    html = render_email(
        "email_action.html",
        username=db_user.username,
        title="Reset your password",
        body="we received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.",
        action_url=reset_url,
        action_label="Reset password",
        footer="If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.",
    )
    await send_email(db_user.email, "Reset your password", html)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute") # pyright: ignore[reportUntypedFunctionDecorator, reportUnknownMemberType] # fmt: skip
async def reset_password(request: Request, response: Response, body: ResetPassword):
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    token = session.get(PasswordResetToken, body.id)
    if (
        not token
        or not token.verify_token(body.token)
        or token.is_expired(token.max_age)
    ):
        raise ServerBadRequestException(message="Invalid or expired token")

    user = token.user
    user.set_password(body.password)
    session.add(user)
    session.delete(token)
    for s in user.sessions:
        session.delete(s)
    session.commit()

    _set_session_headers(response, None)


@router.post("/verify-email", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute") # pyright: ignore[reportUntypedFunctionDecorator, reportUnknownMemberType] # fmt: skip
async def verify_email(request: Request, body: VerifyEmail):
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    token = session.get(EmailVerificationToken, body.id)
    if (
        not token
        or not token.verify_token(body.token)
        or token.is_expired(token.max_age)
    ):
        raise ServerBadRequestException(message="Invalid or expired token")

    user = token.user
    user.verified = True
    session.add(user)
    session.delete(token)
    session.commit()


@router.patch("/change-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute") # pyright: ignore[reportUntypedFunctionDecorator, reportUnknownMemberType] # fmt: skip
@with_session()
async def change_password(
    request: Request,
    response: Response,
    password_data: UserChangePassword,
    session: UserSession | None,
):
    if session is None:
        raise ServerUnauthorizedException(
            message="You must be logged in to change your password"
        )
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    user = session.user
    if not user.verify_password(password_data.old_password):
        raise ServerForbiddenException(message="Old password is incorrect")
    user.set_password(password_data.password)
    db_session.add(user)
    for s in user.sessions:
        db_session.delete(s)
    db_session.commit()
    db_session.refresh(user)

    _set_session_headers(response, None)


@router.get("/", status_code=status.HTTP_200_OK)
@with_user(roles=[Role.admin])
async def get_users(request: Request) -> list[User]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    UserSession.delete_expired(session)
    return list(session.exec(select(User)).all())


@router.get("/{user_id}", status_code=status.HTTP_200_OK)
@with_user(roles=[Role.admin])
async def get_user(request: Request, user_id: uuid.UUID) -> User:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    user = session.get(User, user_id)
    if not user:
        raise ServerNotFoundException
    return user


@router.post("/", status_code=status.HTTP_201_CREATED)
@with_user(roles=[Role.admin])
async def create_user(request: Request, user: UserCreate) -> User:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    db_user = User.model_validate(user)
    db_user.set_password(user.password)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


@router.patch("/", status_code=status.HTTP_200_OK)
@with_user(roles=[Role.admin])
async def update_user(request: Request, user: UserUpdate) -> User:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    db_user = session.get(User, user.id)
    if not db_user:
        raise ServerNotFoundException
    db_user.update_model(user)
    if user.password:
        db_user.set_password(user.password)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


@router.delete("/sessions/{id}", status_code=status.HTTP_204_NO_CONTENT)
@with_user(roles=[Role.admin])
async def delete_session(request: Request, id: uuid.UUID):
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    user_session = db_session.get(UserSession, id)
    if not user_session:
        raise ServerNotFoundException
    db_session.delete(user_session)
    db_session.commit()


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
@with_user(roles=[Role.admin])
async def delete_user(request: Request, id: uuid.UUID):
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    user = session.get(User, id)
    if not user:
        raise ServerNotFoundException
    session.delete(user)
    session.commit()


@router.get("/reset-tokens/", status_code=status.HTTP_200_OK)
@with_user(roles=[Role.admin])
async def get_reset_tokens(request: Request) -> list[PasswordResetToken]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    return list(session.exec(select(PasswordResetToken)).all())


@router.delete("/reset-tokens/{id}", status_code=status.HTTP_204_NO_CONTENT)
@with_user(roles=[Role.admin])
async def delete_reset_token(request: Request, id: uuid.UUID):
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    token = session.get(PasswordResetToken, id)
    if not token:
        raise ServerNotFoundException
    session.delete(token)
    session.commit()


@router.get("/verify-tokens/", status_code=status.HTTP_200_OK)
@with_user(roles=[Role.admin])
async def get_verify_tokens(request: Request) -> list[EmailVerificationToken]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    return list(session.exec(select(EmailVerificationToken)).all())


@router.delete("/verify-tokens/{id}", status_code=status.HTTP_204_NO_CONTENT)
@with_user(roles=[Role.admin])
async def delete_verify_token(request: Request, id: uuid.UUID):
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    token = session.get(EmailVerificationToken, id)
    if not token:
        raise ServerNotFoundException
    session.delete(token)
    session.commit()
