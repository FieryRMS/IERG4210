import uuid

from sqlmodel import Field

from .base import SQLModel


class ImageProductLink(SQLModel, table=True):
    image_id: uuid.UUID = Field(foreign_key="images.id", primary_key=True)
    product_id: uuid.UUID = Field(foreign_key="products.id", primary_key=True)


__all__ = ["ImageProductLink"]
