import uuid

from argon2 import PasswordHasher
from fastapi import APIRouter, Request, status, Cookie
from typing import Annotated
from sqlmodel import Session as SQLSession, select

from db import User, UserBase, UserCreate, Session as UserSession
from models.app import State
from models.errors import NotFoundException
from fastapi_decorators import depends
import os

router = APIRouter(prefix="/users", tags=["Users"])

COOKIE_NAME = "__Host-session" if os.getenv("API_MODE") != "dev" else "session"

_ph = PasswordHasher()


def with_user():
    def dependency(
        request: Request, token: Annotated[str | None, Cookie(alias=COOKIE_NAME)]
    ) -> None | User:
        state: State = request.state  # pyright: ignore[reportAssignmentType]
        if not token:
            return None

        with SQLSession(state["engine"]) as session:
            user_session = session.exec(
                select(UserSession).where(UserSession.token == token)
            ).first()
            if not user_session:
                return None
            return user_session.user

    return depends(user=dependency)


@router.get("/", status_code=status.HTTP_200_OK)
async def get_users(request: Request) -> list[User]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with SQLSession(state["engine"]) as session:
        return list(session.exec(select(User)).all())


@router.get("/me", status_code=status.HTTP_200_OK)
@with_user()
async def get_current_user(user: User | None) -> User | None:
    if user is None:
        raise NotFoundException
    return user


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
        db_user = User.model_validate(user, update={"password_hash": _ph.hash(user.password)})
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
        return db_user


@router.put("/{user_id}", status_code=status.HTTP_200_OK)
async def update_user(request: Request, user_id: uuid.UUID, user: UserBase) -> User:
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
