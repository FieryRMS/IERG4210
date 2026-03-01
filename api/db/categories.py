from db.base import SQLModel


class Category(SQLModel, table=True):
    __tablename__ = "categories"  # pyright: ignore[reportAssignmentType]
    name: str
    description: str | None = None
