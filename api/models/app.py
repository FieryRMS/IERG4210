from logging import Logger
from typing import TypedDict

from sqlalchemy import Engine


class State(TypedDict):
    logger: Logger
    engine: Engine
    debug: bool
