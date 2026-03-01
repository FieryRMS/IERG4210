from db.base import SQLModel
from sqlmodel import JSON, Column, Field


class Product(SQLModel, table=True):
    __tablename__ = "products"  # pyright: ignore[reportAssignmentType]

    catid: int = Field(foreign_key="categories.id")
    name: str
    price: float
    description: str | None = None
    images: list[str] | None = Field(default=None, sa_column=Column(JSON))
