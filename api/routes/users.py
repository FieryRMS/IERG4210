import uuid
from datetime import datetime, timedelta, timezone

from typing import Annotated

from fastapi import APIRouter, Depends, Request, status, Response
from fastapi.security import APIKeyHeader
from sqlmodel import select
from email_validator import validate_email, EmailNotValidError

from db import (
    User,
    UserCreate,
    UserLogin,
    UserUpdate,
    Session as UserSession,
    UserChangePassword,
)
from models import State, NotFoundException, UnauthorizedException
from fastapi_decorators import depends

router = APIRouter(prefix="/users", tags=["Users"])

_session_scheme = APIKeyHeader(name="X-Session-Token", auto_error=False)


def _set_session_headers(response: Response, user_session: UserSession | None):
    expires = (
        user_session.created_at + timedelta(seconds=user_session.max_age)
        if user_session
        else datetime.now(timezone.utc)
    ).strftime("%a, %d %b %Y %H:%M:%S GMT")
    response.headers[_session_scheme.model.name] = (
        f"{user_session.token if user_session else ''}#{expires}"
    )


def with_session():
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

    return depends(session=dependency)


def with_role(roles: list[str]):
    @with_session()
    def dependency(session: UserSession | None):
        if session is None or session.user.role.value not in roles:
            raise UnauthorizedException()

    return depends(dependency)


@router.get("/me", status_code=status.HTTP_200_OK)
@with_session()
async def get_current_user(session: UserSession | None) -> User | None:
    if session is None:
        return None
    return session.user


@router.post("/me", status_code=status.HTTP_200_OK)
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

    if not db_user or not db_user.verify_password(credentials.password):
        raise UnauthorizedException()

    user_session = UserSession(user_id=db_user.id)
    session.add(user_session)
    session.commit()
    session.refresh(db_user)

    _set_session_headers(response, user_session)
    return db_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
@with_session()
async def logout(request: Request, response: Response, session: UserSession | None):
    if session is None:
        raise NotFoundException
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    db_session.delete(session)
    db_session.commit()
    _set_session_headers(response, None)


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: Request, response: Response, user: UserCreate) -> User:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]

    db_user = User.model_validate(user)
    db_user.set_password(user.password)
    user_session = UserSession(user_id=db_user.id)
    session.add(db_user)
    session.add(user_session)
    session.commit()
    session.refresh(db_user)
    session.refresh(user_session)

    _set_session_headers(response, user_session)
    return db_user


@router.put("/change-password", status_code=status.HTTP_200_OK)
@with_session()
async def change_password(
    request: Request,
    response: Response,
    password_data: UserChangePassword,
    session: UserSession | None,
) -> User:
    if session is None:
        raise NotFoundException
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    user = session.user
    if not user.verify_password(password_data.old_password):
        raise UnauthorizedException
    user.set_password(password_data.password)
    db_session.add(user)
    for s in user.sessions:
        db_session.delete(s)
    db_session.commit()
    db_session.refresh(user)

    _set_session_headers(response, None)
    return user


@router.get("/", status_code=status.HTTP_200_OK)
@with_role(["admin"])
async def get_users(request: Request) -> list[User]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    return list(session.exec(select(User)).all())


@router.get("/{user_id}", status_code=status.HTTP_200_OK)
@with_role(["admin"])
async def get_user(request: Request, user_id: uuid.UUID) -> User:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    user = session.get(User, user_id)
    if not user:
        raise NotFoundException
    return user


@router.post("/", status_code=status.HTTP_201_CREATED)
@with_role(["admin"])
async def create_user(request: Request, user: UserCreate) -> User:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    db_user = User.model_validate(user)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


@router.put("/{user_id}", status_code=status.HTTP_200_OK)
@with_role(["admin"])
async def update_user(request: Request, user_id: uuid.UUID, user: UserUpdate) -> User:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    db_user = session.get(User, user_id)
    if not db_user:
        raise NotFoundException
    db_user.update_model(user)
    if user.password:
        db_user.set_password(user.password)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
@with_role(["admin"])
async def delete_session(request: Request, session_id: uuid.UUID):
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    user_session = db_session.get(UserSession, session_id)
    if not user_session:
        raise NotFoundException
    db_session.delete(user_session)
    db_session.commit()


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
@with_role(["admin"])
async def delete_user(request: Request, user_id: uuid.UUID):
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    user = session.get(User, user_id)
    if not user:
        raise NotFoundException
    session.delete(user)
    session.commit()
