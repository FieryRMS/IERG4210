import uuid

from pydantic import computed_field
from sqlmodel import Field, Relationship

from db.base import SQLModel
from models import BaseModel
from pydantic_partial import PartialModelMixin


class CategoryCreate(PartialModelMixin, BaseModel):
    name: str
    description: str | None = None


class CategoryUpdate(CategoryCreate.as_partial(), BaseModel):
    id: uuid.UUID


class Category(CategoryCreate, SQLModel, table=True):
    __tablename__ = "categories"  # pyright: ignore[reportAssignmentType]

    products: list[Product] = Relationship(
        back_populates="category", cascade_delete=True
    )


class ImageProductLink(SQLModel, table=True):
    image_id: uuid.UUID = Field(foreign_key="images.id", primary_key=True)
    product_id: uuid.UUID = Field(foreign_key="products.id", primary_key=True)


class ImageCreate(PartialModelMixin, BaseModel):
    alt: str | None = None
    url: str


class ImageUpdate(ImageCreate.as_partial(), BaseModel):
    id: uuid.UUID


class Image(ImageCreate, SQLModel, table=True):
    __tablename__ = "images"  # pyright: ignore[reportAssignmentType]

    products: list["Product"] = Relationship(
        back_populates="images", link_model=ImageProductLink
    )


class _Product(BaseModel):
    catid: uuid.UUID = Field(foreign_key="categories.id", ondelete="CASCADE")
    name: str
    price: float
    description: str | None = None


class ProductCreate(PartialModelMixin, _Product):
    images: list[uuid.UUID] = []


class ProductUpdate(ProductCreate.as_partial(), BaseModel):
    id: uuid.UUID


class Product(_Product, SQLModel, table=True):
    __tablename__ = "products"  # pyright: ignore[reportAssignmentType]

    category: Category = Relationship(back_populates="products")
    images: list[Image] = Relationship(
        back_populates="products",
        link_model=ImageProductLink,
        sa_relationship_kwargs={"lazy": "selectin"},
    )

    @computed_field(alias="images")
    @property
    def _images(self) -> list[Image]:
        return self.images
