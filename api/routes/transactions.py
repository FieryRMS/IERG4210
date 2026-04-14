from fastapi import APIRouter, Request, status
from models import Role, State, Transaction, User
from sqlmodel import select

from .users import with_user

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("/", status_code=status.HTTP_200_OK)
@with_user(roles=[Role.admin])
async def get_transactions(request: Request) -> list[Transaction]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    return list(db_session.exec(select(Transaction)).all())


@router.get("/me/", status_code=status.HTTP_200_OK)
@with_user()
async def get_my_transactions(user: User) -> list[Transaction]:
    return user.transactions