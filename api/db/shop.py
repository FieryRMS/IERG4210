import uuid

from pydantic import computed_field
from sqlmodel import Field, Relationship

from db.base import SQLModel
from models import BaseModel
from pydantic_partial import PartialModelMixin


class CategoryCreate(PartialModelMixin, BaseModel):
    name: str = Field(min_length=3)
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
    name: str = Field(min_length=3)
    price: float = Field(gt=0)
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
    order_links: list["OrderProductLink"] = Relationship(
        back_populates="product", cascade_delete=True
    )

    @computed_field(alias="images")
    @property
    def _images(self) -> list[Image]:
        return self.images


class _ProductOrder(BaseModel):
    product_id: uuid.UUID
    count: int = Field(gt=0, le=10_000)


class CreateOrder(BaseModel):
    products: list[_ProductOrder] = Field(min_length=1)


class DeleteOrder(BaseModel):
    id: uuid.UUID


class OrderProductLink(SQLModel, table=True):
    order_id: uuid.UUID = Field(foreign_key="orders.id", primary_key=True)
    product_id: uuid.UUID = Field(foreign_key="products.id", primary_key=True)

    order: "Order" = Relationship(back_populates="product_links")
    product: Product = Relationship(back_populates="order_links")

    count: int = Field(gt=0, default=1)
    price: float = Field(gt=0)  # price at the time of order, for record keeping


class Order(SQLModel, table=True):
    __tablename__ = "orders"  # pyright: ignore[reportAssignmentType]

    user_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE")
    max_age: int = 60 * 60 * 24 * 7  # 7 days in seconds

    product_links: list[OrderProductLink] = Relationship(
        back_populates="order", cascade_delete=True
    )
