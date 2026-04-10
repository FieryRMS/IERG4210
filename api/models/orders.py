import enum
import uuid
from typing import TYPE_CHECKING

from pydantic import computed_field
from pydantic_partial import PartialModelMixin
from sqlmodel import Field, Relationship, UniqueConstraint

from .base import BaseModel, SQLModel

if TYPE_CHECKING:
    from .products import Product


class Currency(str, enum.Enum):
    HKD = "HKD"


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
    order_id: uuid.UUID | None = Field(
        default=None, foreign_key="orders.id", primary_key=True
    )
    product_id: uuid.UUID | None = Field(
        default=None, foreign_key="products.id", primary_key=True
    )

    order: "Order" = Relationship(back_populates="product_links")
    product: "Product" = Relationship(back_populates="order_links")


class Order(OrderDetails, SQLModel, table=True):
    __tablename__ = "orders"  # pyright: ignore[reportAssignmentType]
    __table_args__ = (UniqueConstraint("user_id", "ray_id"),)

    price: float
    max_age: int = 60 * 60 * 24 * 7  # 7 days in seconds
    paid: bool = False

    product_links: list[OrderProductLink] = Relationship(
        back_populates="order", cascade_delete=True
    )

    @computed_field()
    @property
    def products(self) -> list[ProductOrder]:
        return [
            ProductOrder.model_validate(link.product.model_dump() | link.model_dump())
            for link in self.product_links
        ]


__all__ = [
    "Order",
    "OrderCreate",
    "OrderUpdate",
    "OrderProductLink",
    "ProductOrder",
    "OrderCreateProducts",
]
