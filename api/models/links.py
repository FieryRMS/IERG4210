import uuid
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship

from .base import SQLModel

if TYPE_CHECKING:
    from .orders import Order
    from .products import Product


class ImageProductLink(SQLModel, table=True):
    image_id: uuid.UUID = Field(foreign_key="images.id", primary_key=True)
    product_id: uuid.UUID = Field(foreign_key="products.id", primary_key=True)


class OrderProductLink(SQLModel, table=True):
    order_id: uuid.UUID = Field(foreign_key="orders.id", primary_key=True)
    product_id: uuid.UUID = Field(foreign_key="products.id", primary_key=True)

    order: "Order" = Relationship(back_populates="product_links")
    product: "Product" = Relationship(back_populates="order_links")

    count: int = Field(gt=0, default=1)
    price: float = Field(gt=0)  # price at the time of order, for record keeping


__all__ = ["ImageProductLink", "OrderProductLink"]
