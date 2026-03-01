from db.base import SQLModel
from models import BaseModel
from sqlmodel import JSON, Column, Field, Relationship


class CategoryBase(BaseModel):
    name: str
    description: str | None = None


class Category(CategoryBase, SQLModel, table=True):
    __tablename__ = "categories"  # pyright: ignore[reportAssignmentType]

    products: list[Product] = Relationship(
        back_populates="category", cascade_delete=True
    )


class ProductBase(BaseModel):
    catid: int = Field(foreign_key="categories.id")
    name: str
    price: float
    description: str | None = None
    images: list[str] | None = Field(default=None, sa_column=Column(JSON))


class Product(ProductBase, SQLModel, table=True):
    __tablename__ = "products"  # pyright: ignore[reportAssignmentType]

    category: Category | None = Relationship(back_populates="products")
