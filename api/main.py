import logging
import os
from collections.abc import Callable
from contextlib import asynccontextmanager
from typing import Any

import dotenv
from fastapi import FastAPI, Request, Response
from fastapi.routing import APIRoute
from sqlalchemy import create_engine

import routes
import routes.categories
from models.app import State

dotenv.load_dotenv()  # Load environment variables from .env file

from db import *

DEBUG = os.getenv("API_MODE", "prod") == "dev"
POSTGRES_URL = os.getenv("POSTGRES_URL")

logging.basicConfig(
    format="[%(asctime)s][%(levelname)s][%(name)s] %(message)s",
    level=logging.DEBUG if DEBUG else logging.INFO,
)
logging.getLogger("sqlalchemy.engine").setLevel(
    logging.DEBUG if DEBUG else logging.INFO
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.debug = DEBUG
    state: State = app.state  # pyright: ignore[reportAssignmentType]
    state["logger"] = logging.getLogger("IERG4210-API")

    assert POSTGRES_URL is not None, "POSTGRES_URL environment variable must be set"
    state["engine"] = create_engine(POSTGRES_URL)
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
    request.state["logger"].debug(f"Request: {request.method}")
    response: Response = await call_next(request)
    request.state["logger"].debug(f"Response: {response.status_code}")
    return response


@app.middleware("http")
async def inject_state(
    request: Request[State], call_next: Callable[..., Any]
) -> Response:
    appstate: State = request.app.state
    request.state["logger"] = appstate["logger"].getChild(f"{request.url.path}")
    request.state["debug"] = appstate["debug"]
    request.state["engine"] = appstate["engine"]
    return await call_next(request)


app.include_router(routes.root.router)
app.include_router(routes.categories.router)
app.include_router(routes.products.router)
app.include_router(routes.images.router)
app.include_router(routes.users.router)