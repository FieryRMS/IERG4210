import uuid

from pydantic import computed_field
from sqlmodel import Field, Relationship

from db.base import SQLModel
from models import BaseModel


class CategoryBase(BaseModel):
    name: str
    description: str | None = None


class Category(CategoryBase, SQLModel, table=True):
    __tablename__ = "categories"  # pyright: ignore[reportAssignmentType]

    products: list[Product] = Relationship(
        back_populates="category", cascade_delete=True
    )


class ImageProductLink(SQLModel, table=True):
    image_id: uuid.UUID = Field(foreign_key="images.id", primary_key=True)
    product_id: uuid.UUID = Field(foreign_key="products.id", primary_key=True)


class ImageBase(BaseModel):
    alt: str | None = None
    url: str


class Image(ImageBase, SQLModel, table=True):
    __tablename__ = "images"  # pyright: ignore[reportAssignmentType]

    products: list["Product"] = Relationship(
        back_populates="images", link_model=ImageProductLink
    )


class ProductBase(BaseModel):
    catid: uuid.UUID = Field(foreign_key="categories.id")
    name: str
    price: float
    description: str | None = None


class ProductUpdate(ProductBase):
    images: list[uuid.UUID] = []


class Product(ProductBase, SQLModel, table=True):
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
