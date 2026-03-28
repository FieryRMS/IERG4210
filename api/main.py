import logging
import os
from collections.abc import Callable
from contextlib import asynccontextmanager
from typing import Any

import dotenv
from fastapi import FastAPI, Request, Response
from fastapi.routing import APIRoute
from sqlmodel import create_engine, Session as SQLSession

import routes
import routes.categories
from models.app import State

dotenv.load_dotenv()  # Load environment variables from .env file

from db import *

DEBUG = os.getenv("EXE_MODE", "prod") == "dev"
POSTGRES_URL = os.getenv("POSTGRES_URL")


class ColoredFormatter(logging.Formatter):
    _LEVEL_COLORS = {
        logging.DEBUG: "\033[36m",  # cyan
        logging.INFO: "\033[32m",  # green
        logging.WARNING: "\033[33m",  # yellow
        logging.ERROR: "\033[31m",  # red
        logging.CRITICAL: "\033[1;31m",  # bold red
    }
    _RESET = "\033[0m"
    _DIM = "\033[2m"
    _NAME_COLORS = [
        "\033[34m",  # blue
        "\033[35m",  # magenta
        "\033[36m",  # cyan
        "\033[33m",  # yellow
        "\033[32m",  # green
        "\033[31m",  # red
        "\033[95m",  # bright magenta
        "\033[94m",  # bright blue
        "\033[96m",  # bright cyan
        "\033[93m",  # bright yellow
    ]

    def _name_color(self, name: str) -> str:
        return self._NAME_COLORS[hash(name) % len(self._NAME_COLORS)]

    def format(self, record: logging.LogRecord) -> str:
        color = self._LEVEL_COLORS.get(record.levelno, self._RESET)
        ts = f"{self._DIM}[{self.formatTime(record, self.datefmt)}]{self._RESET}"
        level = f"{color}[{record.levelname}]{self._RESET}"
        name = f"{self._name_color(record.name)}[{record.name}]{self._RESET}"
        message = f"{color}{record.getMessage()}{self._RESET}"
        if record.exc_info:
            message += "\n" + self.formatException(record.exc_info)
        return f"{ts}{level}{name} {message}"


_handler = logging.StreamHandler()
_handler.setFormatter(ColoredFormatter())
logging.basicConfig(
    handlers=[_handler],
    level=logging.DEBUG if DEBUG else logging.INFO,
)
logging.getLogger("sqlalchemy.engine").setLevel(
    logging.DEBUG if DEBUG else logging.INFO
)
# disable propagation to uvicorn loggers to prevent duplicate logs
logging.getLogger("uvicorn.error").propagate = False
logging.getLogger("uvicorn.access").propagate = False


class EndpointFilter(logging.Filter):
    def __init__(self, excluded_paths: list[str]):
        self.excluded_paths = excluded_paths

    def filter(self, record: logging.LogRecord) -> bool:
        return not any(path in record.getMessage() for path in self.excluded_paths)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.debug = DEBUG
    state: State = app.state  # pyright: ignore[reportAssignmentType]
    state["logger"] = logging.getLogger("IERG4210-API")

    assert POSTGRES_URL is not None, "POSTGRES_URL environment variable must be set"
    state["engine"] = create_engine(POSTGRES_URL)
    if DEBUG:
        EF = EndpointFilter(["/openapi.json"])
        logging.getLogger("uvicorn.access").addFilter(EF)
        state["logger"].addFilter(EF)
    yield
    state["engine"].dispose()


def custom_generate_unique_id(route: APIRoute):
    return f"{route.tags[0]}-{route.name}"


app = FastAPI(
    lifespan=lifespan, debug=DEBUG, generate_unique_id=custom_generate_unique_id
)


@app.middleware("http")
async def log_requests(
    request: Request[State], call_next: Callable[..., Any]
) -> Response:
    request.state["logger"].debug(f"Request: {request.method} {request.url.path}")
    response: Response = await call_next(request)
    request.state["logger"].debug(
        f"Response: {request.method} {request.url.path} {response.status_code}"
    )
    return response


@app.middleware("http")
async def inject_state(
    request: Request[State], call_next: Callable[..., Any]
) -> Response:
    appstate: State = request.app.state
    request.state["logger"] = appstate["logger"]
    request.state["debug"] = appstate["debug"]
    request.state["engine"] = appstate["engine"]
    request.state["session"] = SQLSession(appstate["engine"])
    res = await call_next(request)
    request.state["session"].close()
    return res


app.include_router(routes.root.router)
app.include_router(routes.categories.router)
app.include_router(routes.products.router)
app.include_router(routes.images.router)
app.include_router(routes.users.router)
