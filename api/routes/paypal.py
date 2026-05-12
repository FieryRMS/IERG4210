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


@router.patch("/me/{id}", status_code=status.HTTP_200_OK)
@with_user()
async def capture_paypal_order(request: Request, id: str, user: User) -> Transaction:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    ordersapi = paypal.OrdersApi(api_client)
    authorizationsapi = paypal.AuthorizationsApi(api_client)
    db_session = state["session"]
    transaction = db_session.exec(
        select(Transaction).where(
            Transaction.transaction_id == id
            and Transaction.provider == PaymentProvider.PAYPAL
            and Transaction.user_id == user.id
        )
    ).first()

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

    # Scan sibling transactions: recover if already completed, cancel any others
    # to prevent double-charging before we proceed.
    for order_transaction in db_order.transactions:
        if order_transaction.status == TransactionStatus.COMPLETED:
            # A previous attempt succeeded but paid wasn't flushed — recover and return.
            db_order.paid = True
            db_session.add(db_order)
            db_session.commit()
            return order_transaction
        elif (
            order_transaction.status
            in [TransactionStatus.PENDING, TransactionStatus.AUTHORIZED]
            and order_transaction.id != transaction.id
        ):
            # Void on PayPal if already authorized, then cancel locally.
            _void_transaction(state, authorizationsapi, order_transaction)
            order_transaction.status = TransactionStatus.CANCELED
            db_session.add(order_transaction)

    # Step 1: authorize — locks the funds on the buyer's account.
    try:
        auth_result = ordersapi.orders_authorize(transaction.transaction_id)
        transaction.authorization_id = _get_authorization(auth_result)
        if not transaction.authorization_id:
            raise ServerException(message="No authorization ID returned from PayPal")
        _verify_authorization(transaction, db_order, auth_result)
        transaction.status = TransactionStatus.AUTHORIZED
        transaction.price = db_order.price
        db_session.add(transaction)
        db_session.flush()
    except ServerException:
        raise
    except Exception as e:
        state["logger"].error(f"Failed to authorize PayPal order: {e}")
        _void_transaction(state, authorizationsapi, transaction)
        transaction.status = TransactionStatus.FAILED
        db_session.add(transaction)
        db_session.commit()
        raise ServerException(message="Failed to authorize PayPal order")

    # Step 2: capture — transfers the authorized funds to the merchant.
    try:
        capture_result = authorizationsapi.authorizations_capture(
            transaction.authorization_id
        )
        if capture_result.status == "COMPLETED":
            transaction.status = TransactionStatus.COMPLETED
            db_order.paid = True
        elif capture_result.status == "PENDING":
            # PayPal is reviewing the transaction (e.g. fraud checks).
            transaction.status = TransactionStatus.PENDING
        else:
            transaction.status = TransactionStatus.FAILED
    except paypal.ApiException as e:
        state["logger"].error(f"Failed to capture PayPal authorization: {e}")
        try:
            error = paypal.Error.model_validate_json(
                e.body  # pyright: ignore[reportArgumentType, reportUnknownMemberType]
            )
            if error.details and error.details[0].issue == "INSTRUMENT_DECLINED":
                # Buyer's payment method was declined — leave PENDING so they can retry.
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


def _get_authorization(auth_result: paypal.OrderAuthorizeResponse) -> str | None:
    return (
        auth_result.purchase_units[0].payments.authorizations[0].id
        if auth_result.purchase_units
        and auth_result.purchase_units[0].payments
        and auth_result.purchase_units[0].payments.authorizations
        else None
    )


def _verify_authorization(
    transaction: Transaction,
    db_order: Order,
    auth_result: paypal.OrderAuthorizeResponse,
):
    authorizations = (
        auth_result.purchase_units[0].payments.authorizations
        if auth_result.purchase_units and auth_result.purchase_units[0].payments
        else None
    )
    if not authorizations or len(authorizations) == 0:
        raise ServerException(message="No authorization returned from PayPal")
    authorization = authorizations[0]
    # Verify the authorized amount/currency matches what we expect.
    if (
        authorization.invoice_id != str(transaction.id)
        or authorization.custom_id != str(db_order.id)
        or not authorization.amount
        or authorization.amount.value != f"{db_order.price:.2f}"
        or authorization.amount.currency_code != db_order.currency.value
    ):
        raise ServerException(message="Invalid PayPal order details")


def _void_transaction(
    state: State,
    authorizationsapi: paypal.AuthorizationsApi,
    order_transaction: Transaction,
):
    if (
        order_transaction.status == TransactionStatus.AUTHORIZED
        and order_transaction.authorization_id
    ):
        try:
            authorizationsapi.authorizations_void(order_transaction.authorization_id)
        except Exception as e:
            state["logger"].warning(
                f"Failed to void authorization {order_transaction.authorization_id}: {e}"
            )
