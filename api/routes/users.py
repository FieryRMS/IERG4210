import uuid

from fastapi import APIRouter, Request, status, Cookie, Depends
from typing import Annotated
from sqlmodel import Session as SQLSession, select

from db import User, Session as UserSession
from models.app import State
from models.errors import NotFoundException
from fastapi_decorators import depends
import os

router = APIRouter(prefix="/users", tags=["Users"])

COOKIE_NAME = "__Host-session" if os.getenv("API_MODE") != "dev" else "session"


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


@router.get("/me", status_code=status.HTTP_200_OK)
@with_user()
async def get_current_user(user: User | None) -> User | None:
    if user is None:
        raise NotFoundException
    return user
