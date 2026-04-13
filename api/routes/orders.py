import uuid

import paypal
from fastapi import APIRouter, Request, status
from models import (
    Order,
    OrderCreate,
    OrderCreateProducts,
    OrderProductLink,
    OrderUpdate,
    OrderWithProducts,
    PaypalTransaction,
    Product,
    Role,
    ServerConflictException,
    ServerException,
    ServerNotFoundException,
    State,
    TransactionStatus,
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
async def get_my_orders(request: Request, user: User) -> list[Order]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    return list(db_session.exec(select(Order).where(Order.user_id == user.id)).all())


@router.get("/me/{id}", status_code=status.HTTP_200_OK)
@with_user()
async def get_my_order(
    request: Request, id: uuid.UUID, user: User
) -> OrderWithProducts:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    order = db_session.get(Order, id)
    if not order or order.user_id != user.id:
        raise ServerNotFoundException
    return OrderWithProducts(order=order)


@router.post("/me", status_code=status.HTTP_201_CREATED)
@with_user()
async def create_my_order(request: Request, order: OrderCreate, user: User) -> Order:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    total_price = _validate_order_products(db_session, order.products)
    db_order = Order.model_validate(
        order, update={"price": total_price, "user_id": user.id}
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
    return db_order


@router.delete("/me/{id}", status_code=status.HTTP_204_NO_CONTENT)
@with_user()
async def delete_my_order(request: Request, id: uuid.UUID, user: User):
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    db_order = db_session.get(Order, id)
    if not db_order or db_order.user_id != user.id:
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


@router.post("/me/paypal/{id}", status_code=status.HTTP_200_OK)
@with_user()
async def create_paypal_order(
    request: Request, id: uuid.UUID, user: User
) -> PaypalTransaction:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    api = state["OrdersApi"]
    db_order = db_session.get(Order, id)
    if not db_order or db_order.user_id != user.id:
        raise ServerNotFoundException
    transaction = PaypalTransaction(
        order_id=db_order.id,
        transaction_id="",
        amount=db_order.price,
        status=TransactionStatus.PENDING,
    )

    try:
        result = api.orders_create(
            paypal.OrderRequest(
                intent=paypal.CheckoutPaymentIntent.CAPTURE,
                purchase_units=[
                    paypal.PurchaseUnitRequest(
                        custom_id=str(db_order.id),
                        invoice_id=str(transaction.id),
                        description=f"Order #{db_order.id} from The Generic Company",
                        amount=paypal.AmountWithBreakdown(
                            currency_code=db_order.currency,
                            value=f"{db_order.price:.2f}",
                            breakdown=paypal.AmountBreakdown(
                                item_total=paypal.Money(
                                    currency_code=db_order.currency,
                                    value=f"{db_order.price:.2f}",
                                )
                            ),
                        ),
                        items=[
                            paypal.ItemRequest(
                                name=link.product.name,
                                quantity=str(link.count),
                                unit_amount=paypal.Money(
                                    currency_code=db_order.currency,
                                    value=f"{link.price:.2f}",
                                ),
                                description=(
                                    f"{link.product.description[:100]}{'...' if len(link.product.description) > 100 else ''}"
                                    if link.product.description
                                    else None
                                ),
                            )
                            for link in db_order.product_links
                        ],
                    )
                ],
            ),
            prefer="return=minimal",
        )
        if not result.id:
            raise ServerException()
    except Exception as e:
        state["logger"].error(f"Failed to create PayPal order: {e}")
        raise ServerException(message="Failed to create PayPal order")

    transaction.transaction_id = result.id
    db_session.add(transaction)
    db_session.commit()
    db_session.refresh(transaction)
    return transaction


@router.put("/me/paypal/{id}", status_code=status.HTTP_200_OK)
@with_user()
async def capture_paypal_order(
    request: Request, id: str, user: User
) -> PaypalTransaction:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    api = state["OrdersApi"]
    transaction = db_session.exec(
        select(PaypalTransaction).where(PaypalTransaction.transaction_id == id)
    ).first()
    if not transaction:
        raise ServerNotFoundException
    db_order = transaction.order
    if not db_order or db_order.user_id != user.id:
        raise ServerNotFoundException
    if transaction.status != TransactionStatus.PENDING:
        raise ServerConflictException(message="Invalid transaction status")
    if db_order.paid:
        raise ServerConflictException(message="Order has already been paid")
    try:
        result = api.orders_capture(transaction.transaction_id)
        if result.status == paypal.OrderStatus.COMPLETED:
            transaction.status = TransactionStatus.COMPLETED
            db_order.paid = True
        else:
            transaction.status = TransactionStatus.FAILED
    except paypal.ApiException as e:
        state["logger"].error(f"Failed to capture PayPal order: {e}")
        try:
            error = paypal.Error.model_validate_json(
                e.body  # pyright: ignore[reportArgumentType, reportUnknownMemberType]
            )
            state["logger"].error(f"PayPal API error: {error}")
            if error.details and error.details[0].issue == "INSTRUMENT_DECLINED":
                transaction.status = TransactionStatus.PENDING
            else:
                transaction.status = TransactionStatus.FAILED
        except Exception as e2:
            state["logger"].error(f"Failed to parse PayPal API error: {e2}")
            transaction.status = TransactionStatus.FAILED

    db_session.add(transaction)
    db_session.add(db_order)
    db_session.commit()
    db_session.refresh(transaction)

    return transaction
    return transaction
