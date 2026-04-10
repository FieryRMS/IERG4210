import uuid

from fastapi import APIRouter, Request, status
from models import (
    Order,
    OrderCreate,
    OrderCreateProducts,
    OrderProductLink,
    OrderUpdate,
    Product,
    Role,
    ServerConflictException,
    ServerNotFoundException,
    State,
    User,
)
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, select

from .users import with_user

router = APIRouter(prefix="/orders", tags=["Orders"])


def _validate_order_products(
    session: Session, order_products: list[OrderCreateProducts]
) -> float:
    products = session.exec(
        select(Product).where(col(Product.id).in_([p.id for p in order_products]))
    ).all()
    if len(products) != len(order_products):
        raise ServerNotFoundException(detail="One or more products not found")
    product_map = {p.id: p for p in products}
    for op in order_products:
        if op.price != product_map[op.id].price:
            raise ServerConflictException(
                detail=f"Price for product {op.id} does not match"
            )
    return sum(op.price * op.count for op in order_products)


@router.get("/me", status_code=status.HTTP_200_OK)
@with_user()
async def get_my_orders(request: Request, user: User) -> list[Order]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    return list(session.exec(select(Order).where(Order.user_id == user.id)).all())


@router.post("/me", status_code=status.HTTP_201_CREATED)
@with_user()
async def create_my_order(request: Request, order: OrderCreate, user: User) -> Order:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    total_price = _validate_order_products(session, order.products)
    db_order = Order.model_validate(
        order, update={"price": total_price, "user_id": user.id}
    )
    db_order.product_links = [
        OrderProductLink(product_id=op.id, price=op.price, count=op.count)
        for op in order.products
    ]
    session.add(db_order)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise ServerConflictException(detail="Duplicate order for this request")
    session.refresh(db_order)
    return db_order


@router.delete("/me/{id}", status_code=status.HTTP_204_NO_CONTENT)
@with_user()
async def delete_my_order(request: Request, id: uuid.UUID, user: User):
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    db_order = session.get(Order, id)
    if not db_order or db_order.user_id != user.id:
        raise ServerNotFoundException
    session.delete(db_order)
    session.commit()


@router.get("/", status_code=status.HTTP_200_OK)
@with_user(roles=[Role.admin])
async def get_orders(request: Request) -> list[Order]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    return list(session.exec(select(Order)).all())


@router.post("/", status_code=status.HTTP_201_CREATED)
@with_user(roles=[Role.admin])
async def create_order(request: Request, order: OrderCreate) -> Order:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    total_price = _validate_order_products(session, order.products)
    db_order = Order.model_validate(order, update={"price": total_price})
    db_order.product_links = [
        OrderProductLink(product_id=op.id, price=op.price, count=op.count)
        for op in order.products
    ]
    session.add(db_order)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise ServerConflictException(detail="Duplicate order for this request")
    session.refresh(db_order)
    return db_order


@router.put("/", status_code=status.HTTP_200_OK)
@with_user(roles=[Role.admin])
async def update_order(request: Request, order: OrderUpdate) -> Order:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    db_order = session.get(Order, order.id)
    if not db_order:
        raise ServerNotFoundException
    if order.products is not None:  # pyright: ignore[reportUnnecessaryComparison]
        total_price = _validate_order_products(session, order.products)
        db_order.update_model(order, update={"price": total_price})
        db_order.product_links = [
            OrderProductLink(product_id=op.id, price=op.price, count=op.count)
            for op in order.products
        ]
    else:
        db_order.update_model(order)
    session.add(db_order)
    session.commit()
    session.refresh(db_order)
    return db_order


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
@with_user(roles=[Role.admin])
async def delete_order(request: Request, id: uuid.UUID):
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    db_order = session.get(Order, id)
    if not db_order:
        raise ServerNotFoundException
    session.delete(db_order)
    session.commit()
