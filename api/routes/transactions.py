import uuid

from fastapi import APIRouter, Request, status
from models import (
    Role,
    ServerConflictException,
    ServerNotFoundException,
    State,
    Transaction,
    TransactionStatus,
    User,
)
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


@router.put("/cancel/{id}", status_code=status.HTTP_200_OK)
@with_user()
async def cancel_transaction(
    request: Request, id: uuid.UUID, user: User
) -> Transaction:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    transaction = db_session.get(Transaction, id)
    if not transaction or not (
        transaction.user_id == user.id or user.role == Role.admin
    ):
        raise ServerNotFoundException
    if transaction.status not in [
        TransactionStatus.PENDING,
        TransactionStatus.AUTHORIZED,
    ]:
        raise ServerConflictException(
            message="Only pending or authorized transactions can be cancelled"
        )
    transaction.status = TransactionStatus.CANCELED
    db_session.add(transaction)
    db_session.commit()
    db_session.refresh(transaction)
    return transaction
