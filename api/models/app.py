from logging import Logger
from time import time
from typing import TypedDict

import paypal_orders
from models.base import BaseModel
from pydantic import Field
from sqlalchemy import Engine
from sqlmodel import Session


class Authorization(BaseModel):
    access_token: str
    token_type: str
    app_id: str
    expires_in: int
    nonce: str
    created_at: float = Field(
        default_factory=lambda: time() - 100
    )  # Set created_at to 100 seconds ago by default


class State(TypedDict):
    logger: Logger
    engine: Engine
    session: Session
    debug: bool
    OrdersApi: paypal_orders.OrdersApi
    authorization: Authorization
    paypal_config: paypal_orders.Configuration


__all__ = ["State", "Authorization"]
