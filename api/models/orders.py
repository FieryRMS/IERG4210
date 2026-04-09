import uuid

from sqlmodel import Field, Relationship

from .base import BaseModel, SQLModel
from .links import OrderProductLink


class _ProductOrder(BaseModel):
    product_id: uuid.UUID
    count: int = Field(gt=0, le=10_000)


class CreateOrder(BaseModel):
    products: list[_ProductOrder] = Field(min_length=1)


class DeleteOrder(BaseModel):
    id: uuid.UUID


class Order(SQLModel, table=True):
    __tablename__ = "orders"  # pyright: ignore[reportAssignmentType]

    user_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE")
    max_age: int = 60 * 60 * 24 * 7  # 7 days in seconds

    product_links: list[OrderProductLink] = Relationship(
        back_populates="order", cascade_delete=True
    )


__all__ = ["Order", "CreateOrder", "DeleteOrder"]
