import uuid
from typing import TYPE_CHECKING

from pydantic import computed_field
from pydantic_partial import PartialModelMixin
from sqlmodel import Field, Relationship

from .base import BaseModel, SQLModel
from .images import Image
from .links import ImageProductLink

if TYPE_CHECKING:
    from .categories import Category
    from .orders import OrderProductLink



class _Product(BaseModel):
    catid: uuid.UUID = Field(foreign_key="categories.id", ondelete="CASCADE")
    name: str = Field(min_length=3)
    price: float = Field(gt=0)
    description: str | None = None


class ProductCreate(PartialModelMixin, _Product):
    images: list[uuid.UUID] = []


class ProductUpdate(ProductCreate.as_partial(), BaseModel):
    id: uuid.UUID


class Product(_Product, SQLModel, table=True):
    __tablename__ = "products"  # pyright: ignore[reportAssignmentType]

    category: "Category" = Relationship(back_populates="products")
    images: list["Image"] = Relationship(
        back_populates="products",
        link_model=ImageProductLink,
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    order_links: list["OrderProductLink"] = Relationship(
        back_populates="product", cascade_delete=True
    )

    @computed_field(alias="images")
    @property
    def _images(self) -> list["Image"]:
        return self.images

    @computed_field()
    @property
    def category_name(self) -> str:
        return self.category.name


__all__ = ["Product", "ProductCreate", "ProductUpdate"]
