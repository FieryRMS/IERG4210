import uuid

from fastapi import APIRouter, Request, status
from models import (
    Order,
    OrderCreate,
    OrderCreateProducts,
    OrderProductLink,
    OrderUpdate,
    OrderWithProducts,
    Product,
    Role,
    ServerConflictException,
    ServerNotFoundException,
)
from models import Session as UserSession
from models import State
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
        raise ServerNotFoundException(message="One or more products not found")
    product_map = {p.id: p for p in products}
    for op in order_products:
        if op.price != product_map[op.id].price:
            raise ServerConflictException(
                message=f"Price for product {op.id} does not match"
            )
    return sum(op.price * op.count for op in order_products)


@router.get("/me", status_code=status.HTTP_200_OK)
@with_user()
async def get_my_orders(request: Request, session: UserSession) -> list[Order]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    return list(
        db_session.exec(select(Order).where(Order.user_id == session.user.id)).all()
    )


@router.get("/me/{id}", status_code=status.HTTP_200_OK)
@with_user()
async def get_my_order(
    request: Request, id: uuid.UUID, session: UserSession
) -> OrderWithProducts:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    order = db_session.get(Order, id)
    if not order or order.user_id != session.user.id:
        raise ServerNotFoundException
    return OrderWithProducts(order=order)


@router.post("/me", status_code=status.HTTP_201_CREATED)
@with_user()
async def create_my_order(
    request: Request, order: OrderCreate, session: UserSession
) -> OrderWithProducts:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    total_price = _validate_order_products(db_session, order.products)
    db_order = Order.model_validate(
        order, update={"price": total_price, "user_id": session.user.id}
    )
    db_order.product_links = [
        OrderProductLink(
            order_id=db_order.id, product_id=op.id, price=op.price, count=op.count
        )
        for op in order.products
    ]
    db_session.add(db_order)
    try:
        db_session.commit()
    except IntegrityError:
        db_session.rollback()
        raise ServerConflictException(message="Duplicate order for this request")
    db_session.refresh(db_order)
    return OrderWithProducts(order=db_order)


@router.delete("/me/{id}", status_code=status.HTTP_204_NO_CONTENT)
@with_user()
async def delete_my_order(request: Request, id: uuid.UUID, session: UserSession):
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    db_order = db_session.get(Order, id)
    if not db_order or db_order.user_id != session.user.id:
        raise ServerNotFoundException
    if db_order.paid:
        raise ServerConflictException(message="Cannot delete a paid order")
    db_session.delete(db_order)
    db_session.commit()


@router.get("/", status_code=status.HTTP_200_OK)
@with_user(roles=[Role.admin])
async def get_orders(request: Request) -> list[Order]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    return list(db_session.exec(select(Order)).all())


@router.post("/", status_code=status.HTTP_201_CREATED)
@with_user(roles=[Role.admin])
async def create_order(request: Request, order: OrderCreate) -> Order:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    total_price = _validate_order_products(db_session, order.products)
    db_order = Order.model_validate(order, update={"price": total_price})
    db_order.product_links = [
        OrderProductLink(
            order_id=db_order.id, product_id=op.id, price=op.price, count=op.count
        )
        for op in order.products
    ]
    db_session.add(db_order)
    try:
        db_session.commit()
    except IntegrityError:
        db_session.rollback()
        raise ServerConflictException(message="Duplicate order for this request")
    db_session.refresh(db_order)
    return db_order


@router.put("/", status_code=status.HTTP_200_OK)
@with_user(roles=[Role.admin])
async def update_order(request: Request, order: OrderUpdate) -> Order:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    db_order = db_session.get(Order, order.id)
    if not db_order:
        raise ServerNotFoundException
    if order.products is not None:  # pyright: ignore[reportUnnecessaryComparison]
        total_price = _validate_order_products(db_session, order.products)
        db_order.update_model(order, update={"price": total_price})
        db_order.product_links = [
            OrderProductLink(
                order_id=db_order.id, product_id=op.id, price=op.price, count=op.count
            )
            for op in order.products
        ]
    else:
        db_order.update_model(order)
    db_session.add(db_order)
    db_session.commit()
    db_session.refresh(db_order)
    return db_order


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
@with_user(roles=[Role.admin])
async def delete_order(request: Request, id: uuid.UUID):
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    db_order = db_session.get(Order, id)
    if not db_order:
        raise ServerNotFoundException
    db_session.delete(db_order)
    db_session.commit()
