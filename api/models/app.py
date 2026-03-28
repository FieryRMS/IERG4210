from logging import Logger
from typing import TypedDict

from sqlalchemy import Engine
from sqlmodel import Session


class State(TypedDict):
    logger: Logger
    engine: Engine
    session: Session
    debug: bool
