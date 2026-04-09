import uuid
from typing import TYPE_CHECKING

from pydantic_partial import PartialModelMixin
from sqlmodel import Relationship

from .base import BaseModel, SQLModel
from .links import ImageProductLink

if TYPE_CHECKING:
    from .products import Product


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


__all__ = ["Image", "ImageCreate", "ImageUpdate"]
