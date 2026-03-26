import uuid

from pydantic import computed_field
from sqlmodel import Field, Relationship

from db.base import SQLModel
from models import BaseModel
from pydantic_partial import create_partial_model


class CategoryCreate(BaseModel):
    name: str
    description: str | None = None


class CategoryUpdate(create_partial_model(CategoryCreate), BaseModel):
    pass


class Category(CategoryCreate, SQLModel, table=True):
    __tablename__ = "categories"  # pyright: ignore[reportAssignmentType]

    products: list[Product] = Relationship(
        back_populates="category", cascade_delete=True
    )


class ImageProductLink(SQLModel, table=True):
    image_id: uuid.UUID = Field(foreign_key="images.id", primary_key=True)
    product_id: uuid.UUID = Field(foreign_key="products.id", primary_key=True)


class ImageCreate(BaseModel):
    alt: str | None = None
    url: str


class ImageUpdate(create_partial_model(ImageCreate), BaseModel):
    pass


class Image(ImageCreate, SQLModel, table=True):
    __tablename__ = "images"  # pyright: ignore[reportAssignmentType]

    products: list["Product"] = Relationship(
        back_populates="images", link_model=ImageProductLink
    )


class _Product(BaseModel):
    catid: uuid.UUID = Field(foreign_key="categories.id")
    name: str
    price: float
    description: str | None = None


class ProductCreate(_Product):
    images: list[uuid.UUID] = []


class ProductUpdate(create_partial_model(ProductCreate), BaseModel):
    pass


class Product(_Product, SQLModel, table=True):
    __tablename__ = "products"  # pyright: ignore[reportAssignmentType]
    UPSERT_EXCLUDE_FIELDS = {"images"}

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
