import uuid

from argon2.exceptions import VerificationError
from fastapi import APIRouter, Request, status, Cookie, Response
from typing import Annotated
from sqlmodel import Session as SQLSession, select
from email_validator import validate_email, EmailNotValidError

from db import (
    User,
    UserCreate,
    UserLogin,
    UserUpdate,
    Session as UserSession,
    CookieSettings,
    SESSION_COOKIE_SETTINGS,
)
from models import State, NotFoundException, UnauthorizedException
from fastapi_decorators import depends

router = APIRouter(prefix="/users", tags=["Users"])


def with_session():
    def dependency(
        request: Request,
        token: Annotated[str | None, Cookie(alias=SESSION_COOKIE_SETTINGS["key"])],
    ) -> None | UserSession:
        state: State = request.state  # pyright: ignore[reportAssignmentType]
        if not token:
            return None

        with SQLSession(state["engine"]) as session:
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


@router.get("/", status_code=status.HTTP_200_OK)
async def get_users(request: Request) -> list[User]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with SQLSession(state["engine"]) as session:
        return list(session.exec(select(User)).all())


@router.get("/me", status_code=status.HTTP_200_OK)
@with_session()
async def get_current_user(session: UserSession | None) -> User | None:
    if session is None:
        raise NotFoundException
    return session.user


@router.post("/me", status_code=status.HTTP_200_OK)
async def login(request: Request, response: Response, credentials: UserLogin) -> User:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with SQLSession(state["engine"]) as session:
        try:
            validate_email(credentials.identifier)
            db_user = session.exec(
                select(User).where(User.email == credentials.identifier)
            ).first()
        except EmailNotValidError:
            db_user = session.exec(
                select(User).where(User.username == credentials.identifier)
            ).first()

        if not db_user:
            raise UnauthorizedException()
        try:
            db_user.verify_password(credentials.password)
        except VerificationError:
            raise UnauthorizedException()

        user_session = UserSession(user_id=db_user.id)
        session.add(user_session)
        session.commit()
        response.set_cookie(**SESSION_COOKIE_SETTINGS, value=user_session.token)
        session.refresh(db_user)
        return db_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
@with_session()
async def logout(request: Request, response: Response, session: UserSession | None):
    if session is None:
        raise NotFoundException
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with SQLSession(state["engine"]) as sql_session:
        db_session = sql_session.get(UserSession, session.id)
        if db_session:
            sql_session.delete(db_session)
            sql_session.commit()
    del_cookie: CookieSettings = {**SESSION_COOKIE_SETTINGS, "max_age": 0, "expires": 0}
    response.set_cookie(**del_cookie)


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: Request, response: Response, user: UserCreate) -> User:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with SQLSession(state["engine"]) as session:
        db_user = User.model_validate(user)
        user_session = UserSession(user_id=db_user.id)
        session.add(db_user)
        session.add(user_session)
        session.commit()
        session.refresh(db_user)
        response.set_cookie(**SESSION_COOKIE_SETTINGS, value=user_session.token)
        return db_user


@router.get("/{user_id}", status_code=status.HTTP_200_OK)
async def get_user(request: Request, user_id: uuid.UUID) -> User:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with SQLSession(state["engine"]) as session:
        user = session.get(User, user_id)
        if not user:
            raise NotFoundException
        return user


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(request: Request, user: UserCreate) -> User:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with SQLSession(state["engine"]) as session:
        db_user = User.model_validate(user)
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
        return db_user


@router.put("/{user_id}", status_code=status.HTTP_200_OK)
async def update_user(request: Request, user_id: uuid.UUID, user: UserUpdate) -> User:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with SQLSession(state["engine"]) as session:
        db_user = session.get(User, user_id)
        if not db_user:
            raise NotFoundException
        db_user.update_model(user)
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
        return db_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(request: Request, user_id: uuid.UUID) -> None:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with SQLSession(state["engine"]) as session:
        user = session.get(User, user_id)
        if not user:
            raise NotFoundException
        session.delete(user)
        session.commit()
