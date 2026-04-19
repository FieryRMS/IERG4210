from .base import BaseModel


class Health(BaseModel):
    status: str

__all__ = ["Health"]