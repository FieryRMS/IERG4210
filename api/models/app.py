from logging import Logger
from time import time
from typing import TypedDict

import redis.asyncio as redis
from models.base import BaseModel
from pydantic import Field, computed_field
from sqlalchemy import Engine
from sqlmodel import Session


class Authorization(BaseModel):
    access_token: str
    token_type: str
    app_id: str
    nonce: str
    created_at: float = Field(default_factory=lambda: time())

    expires_in: int

    @computed_field
    @property
    def is_expired(self) -> bool:
        return self.expires_in + self.created_at < time()

    def model_post_init(self, __context: object) -> None:
        self.expires_in = self.expires_in - 60


class State(TypedDict):
    logger: Logger
    engine: Engine
    session: Session
    debug: bool
    redis: redis.Redis


__all__ = ["State", "Authorization"]
