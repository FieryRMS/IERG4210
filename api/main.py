import logging
import os
from collections.abc import Callable
from contextlib import asynccontextmanager
from typing import Any

import dotenv
from fastapi import FastAPI, Request, Response
from models.app import State
from routes import root
from sqlalchemy import create_engine

dotenv.load_dotenv()  # Load environment variables from .env file


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.debug = os.getenv("MODE", "prod") == "dev"

    logging.basicConfig(
        format="[%(asctime)s][%(levelname)s][%(name)s] %(message)s",
        level=logging.DEBUG if app.state.debug else logging.INFO,
    )
    state: State = app.state  # pyright: ignore[reportAssignmentType]
    state["logger"] = logging.getLogger("IERG4210-API")
    state["engine"] = create_engine(
        f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}"
        f"@{os.getenv('POSTGRES_HOST')}:{os.getenv('POSTGRES_PORT')}/{os.getenv('POSTGRES_DB')}",
        echo=state["debug"],
    )
    yield


app = FastAPI(lifespan=lifespan)


@app.middleware("http")
async def log_requests(
    request: Request[State], call_next: Callable[..., Any]
) -> Response:
    appstate: State = request.app.state
    logger = appstate["logger"].getChild(f"{request.url.path}")

    request.state["logger"] = logger
    request.state["debug"] = appstate["debug"]
    request.state["engine"] = appstate["engine"]

    logger.debug(f"Request: {request.method} {request.url.path}")
    response: Response = await call_next(request)
    logger.debug(f"Response: {response.status_code} {request.url.path}")
    return response


app.include_router(root.router)
