from db.base import SQLModel
from sqlmodel import Field


class Product(SQLModel, table=True):
    __tablename__ = "products"  # pyright: ignore[reportAssignmentType]

    catid: int = Field(foreign_key="categories.id")
    name: str
    price: float
    description: str | None = None
