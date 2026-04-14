import os
import uuid

import paypal
import requests
from fastapi import APIRouter, Depends, Request, status
from models import (
    Authorization,
    Order,
    PaymentProvider,
    ServerConflictException,
    ServerException,
    ServerNotFoundException,
    State,
    Transaction,
    TransactionStatus,
    User,
)
from sqlmodel import select

from .users import with_user

AUTH_KEY = "paypal:auth"
USERNAME = os.getenv("VITE_O_AUTH_CLIENT_ID", "test")
PASSWORD = os.getenv("O_AUTH_CLIENT_SECRET", "test")

config = paypal.Configuration(
    host=os.getenv("PAYPAL_API_BASE_URL", "https://api-m.sandbox.paypal.com"),
    username=USERNAME,
    password=PASSWORD,
)

api_client = paypal.ApiClient(config)


async def get_authorization(state: State) -> Authorization:
    redis = state["redis"]
    raw = await redis.get(AUTH_KEY)
    if raw:
        auth = Authorization.model_validate_json(raw)
        if not auth.is_expired:
            return auth
    state["logger"].info("Refreshing PayPal access token")
    response = requests.post(
        f"{config.host}/v1/oauth2/token",
        auth=(USERNAME, PASSWORD),
        data={"grant_type": "client_credentials"},
    )
    if response.status_code == 200:
        auth = Authorization(**response.json())
        await redis.set(AUTH_KEY, auth.model_dump_json(), ex=auth.expires_in)
        return auth

    raise ServerException(message="Failed to authenticate with PayPal")


async def setup_paypal(request: Request):
    state: State = request.state  # pyright: ignore[reportAssignmentType]

    auth = await get_authorization(state)
    api_client.set_default_header(  # pyright: ignore[reportUnknownMemberType]
        "Authorization",
        f"Bearer {auth.access_token}",
    )
    api_client.set_default_header(  # pyright: ignore[reportUnknownMemberType]
        "PayPal-Request-Id", str(uuid.uuid4())
    )
    api_client.set_default_header(  # pyright: ignore[reportUnknownMemberType]
        "Prefer", "return=minimal"
    )


router = APIRouter(
    prefix="/paypal", tags=["Paypal"], dependencies=[Depends(setup_paypal)]
)


@router.post("/me/{id}", status_code=status.HTTP_200_OK)
@with_user()
async def create_paypal_order(
    request: Request, id: uuid.UUID, user: User
) -> Transaction:
    api = paypal.OrdersApi(api_client)
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    db_session = state["session"]
    db_order = db_session.get(Order, id)
    if not db_order or db_order.user_id != user.id:
        raise ServerNotFoundException
    if db_order.paid:
        raise ServerConflictException(message="Order has already been paid")

    transaction = Transaction(
        order_id=db_order.id,
        user_id=user.id,
        provider=PaymentProvider.PAYPAL,
        transaction_id="",
        price=db_order.price,
        status=TransactionStatus.PENDING,
    )

    try:
        result = api.orders_create(
            paypal.OrderRequest(
                intent=paypal.CheckoutPaymentIntent.AUTHORIZE,
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
            )
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


@router.put("/me/{id}", status_code=status.HTTP_200_OK)
@with_user()
async def capture_paypal_order(request: Request, id: str, user: User) -> Transaction:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    api = paypal.OrdersApi(api_client)
    db_session = state["session"]
    transaction = db_session.exec(
        select(Transaction).where(
            Transaction.transaction_id == id
            and Transaction.provider == PaymentProvider.PAYPAL
            and Transaction.user_id == user.id
        )
    ).first()

    # Validate transaction and order
    if not transaction:
        raise ServerNotFoundException
    db_order = transaction.order
    if not db_order or db_order.user_id != user.id:
        raise ServerNotFoundException
    if db_order.paid:
        raise ServerConflictException(message="Order has already been paid")
    if transaction.status not in [
        TransactionStatus.PENDING,
        TransactionStatus.AUTHORIZED,
    ]:
        raise ServerConflictException(
            message=f"Invalid transaction status: {transaction.status}"
        )
    for otransaction in db_order.transactions:
        if otransaction.status == TransactionStatus.COMPLETED:
            db_order.paid = True
            db_session.add(db_order)
            db_session.commit()
            return otransaction
        elif (
            otransaction.status
            in [
                TransactionStatus.PENDING,
                TransactionStatus.AUTHORIZED,
            ]
            and otransaction.id != transaction.id
        ):
            raise ServerConflictException(
                message=f"You must cancel any pending or authorized transactions on this order"
            )

    # attempt transaction authorization
    try:
        result = api.orders_authorize(transaction.transaction_id)
        # verify details (amount, currency) match our order
        if (
            not result.purchase_units
            or len(result.purchase_units) == 0
            or not result.purchase_units[0].payments
            or not result.purchase_units[0].payments.authorizations
            or len(result.purchase_units[0].payments.authorizations) == 0
            or not result.purchase_units[0].payments.authorizations[0].invoice_id
            == str(transaction.id)
            or not result.purchase_units[0].payments.authorizations[0].custom_id
            == str(db_order.id)
            or not result.purchase_units[0].payments.authorizations[0].amount
            or not result.purchase_units[0].payments.authorizations[0].amount.value
            == f"{transaction.price:.2f}"
            or not result.purchase_units[0]
            .payments.authorizations[0]
            .amount.currency_code
            == db_order.currency.value
        ):
            raise ServerException(message="Invalid PayPal order details")
    except Exception as e:
        state["logger"].error(f"Failed to authorize PayPal order: {e}")
        raise ServerException(message="Failed to authorize PayPal order")

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
