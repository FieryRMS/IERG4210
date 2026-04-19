import enum
import uuid

from pydantic import computed_field
from pydantic_partial import PartialModelMixin
from sqlmodel import Field, Relationship, UniqueConstraint

from .base import BaseModel, SQLModel
from .products import Product
from .users import User


class Currency(str, enum.Enum):
    Australian_dollar = "AUD"
    Brazilian_real = "BRL"
    Canadian_dollar = "CAD"
    Chinese_Renmenbi = "CNY"
    Czech_koruna = "CZK"
    Danish_krone = "DKK"
    Euro = "EUR"
    Hong_Kong_dollar = "HKD"
    HKD = "HKD"
    # Israeli_new_shekel = "ILS" doesnt exist
    Malaysian_ringgit = "MYR"
    Mexican_peso = "MXN"
    New_Zealand_dollar = "NZD"
    Norwegian_krone = "NOK"
    Philippine_peso = "PHP"
    Polish_złoty = "PLN"
    Pound_sterling = "GBP"
    Russian_ruble = "RUB"
    Singapore_dollar = "SGD"
    Swedish_krona = "SEK"
    Swiss_franc = "CHF"
    Thai_baht = "THB"
    United_States_dollar = "USD"


class OrderDetails(BaseModel):
    user_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE")
    currency: Currency = Currency.HKD
    ray_id: uuid.UUID = Field(default_factory=uuid.uuid4)  # for idempotency


class OrderProductDetails(BaseModel):
    count: int = Field(gt=0, le=100)
    price: float  # price at the time of order, for record keeping


class OrderCreateProducts(OrderProductDetails):
    id: uuid.UUID


class ProductOrder(OrderProductDetails):
    id: uuid.UUID


class OrderCreate(PartialModelMixin, OrderDetails):
    products: list[OrderCreateProducts] = Field(min_length=1)


class OrderUpdate(OrderCreate.as_partial(), BaseModel):
    id: uuid.UUID


class OrderProductLink(OrderProductDetails, SQLModel, table=True):
    order_id: uuid.UUID = Field(foreign_key="orders.id", primary_key=True)
    product_id: uuid.UUID = Field(foreign_key="products.id", primary_key=True)

    order: "Order" = Relationship(back_populates="product_links")
    product: "Product" = Relationship(back_populates="order_links")


class OrderWithProducts(BaseModel):
    order: Order

    @computed_field()
    @property
    def products(self) -> list["Product"]:
        return [link.product for link in self.order.product_links]


class Order(OrderDetails, SQLModel, table=True):
    __tablename__ = "orders"  # pyright: ignore[reportAssignmentType]
    __table_args__ = (UniqueConstraint("user_id", "ray_id"),)

    price: float
    paid: bool = False

    transactions: list["Transaction"] = Relationship(back_populates="order")

    product_links: list[OrderProductLink] = Relationship(
        back_populates="order", cascade_delete=True
    )

    @computed_field()
    @property
    def products(self) -> list[ProductOrder]:
        return [
            ProductOrder(id=link.product_id, count=link.count, price=link.price)
            for link in self.product_links
        ]

    @computed_field()
    @property
    def total_price(self) -> float:
        return sum(link.price * link.count for link in self.product_links)


class TransactionStatus(str, enum.Enum):
    COMPLETED = "COMPLETED"
    PENDING = "PENDING"
    AUTHORIZED = "AUTHORIZED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    CANCELED = "CANCELED"


class PaymentProvider(str, enum.Enum):
    PAYPAL = "PAYPAL"


class Transaction(SQLModel, table=True):
    __tablename__ = "transactions"  # pyright: ignore[reportAssignmentType]
    __table_args__ = (UniqueConstraint("transaction_id", "provider"),)

    order_id: uuid.UUID | None = Field(foreign_key="orders.id")
    user_id: uuid.UUID | None = Field(foreign_key="users.id")
    provider: PaymentProvider
    transaction_id: str
    authorization_id: str | None = Field(default=None, exclude=True)
    price: float = 0
    status: TransactionStatus

    order: Order | None = Relationship(back_populates="transactions")
    user: User | None = Relationship(back_populates="transactions")

    @computed_field(alias="order")
    @property
    def _order(self) -> Order | None:
        return self.order


__all__ = [
    "Order",
    "OrderCreate",
    "OrderUpdate",
    "OrderProductLink",
    "ProductOrder",
    "OrderCreateProducts",
    "OrderWithProducts",
    "TransactionStatus",
    "Currency",
    "PaymentProvider",
    "Transaction",
]
