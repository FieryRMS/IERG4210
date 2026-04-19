import uuid
from typing import TYPE_CHECKING

from pydantic_partial import PartialModelMixin
from sqlmodel import Field, Relationship

from .base import BaseModel, SQLModel

if TYPE_CHECKING:
    from .products import Product


class CategoryCreate(PartialModelMixin, BaseModel):
    name: str = Field(min_length=3)
    description: str | None = None


class CategoryUpdate(CategoryCreate.as_partial(), BaseModel):
    id: uuid.UUID


class Category(CategoryCreate, SQLModel, table=True):
    __tablename__ = "categories"  # pyright: ignore[reportAssignmentType]

    products: list["Product"] = Relationship(
        back_populates="category", cascade_delete=True
    )


__all__ = ["Category", "CategoryCreate", "CategoryUpdate"]
