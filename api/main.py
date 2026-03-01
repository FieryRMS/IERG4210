import logging
import os
from collections.abc import Callable
from contextlib import asynccontextmanager
from typing import Any

import dotenv
from fastapi import FastAPI, Request, Response
from sqlalchemy import create_engine
from sqlmodel import Session, SQLModel

import routes
import routes.categories
from models.app import State

dotenv.load_dotenv()  # Load environment variables from .env file

from db import *

DEBUG = os.getenv("MODE", "prod") == "dev"

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
    state["engine"] = create_engine(
        f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}"
        f"@{os.getenv('POSTGRES_HOST')}:{os.getenv('POSTGRES_PORT')}/{os.getenv('POSTGRES_DB')}",
    )

    if state["debug"]:
        # so edits to the models will be reflected immediately without needing to restart the server
        SQLModel.metadata.drop_all(state["engine"])

    SQLModel.metadata.create_all(state["engine"])

    if state["debug"]:
        cats = [
            Category(name="Electronics", description="Devices and gadgets"),
            Category(name="Books", description="Printed and digital books"),
            Category(name="Clothing", description="Apparel and accessories"),
        ]
        prods = [
            Product(
                catid=1,
                name="Smartphone",
                price=699.99,
                description="Latest model smartphone with advanced features",
            ),
            Product(
                catid=1,
                name="Laptop",
                price=1299.99,
                description="High-performance laptop for work and gaming",
            ),
            Product(
                catid=2,
                name="Novel",
                price=19.99,
                description="Bestselling fiction novel",
            ),
            Product(
                catid=2,
                name="Textbook",
                price=89.99,
                description="Comprehensive textbook for students",
            ),
            Product(
                catid=3,
                name="T-shirt",
                price=12.99,
                description="Comfortable cotton t-shirt",
            ),
            Product(
                catid=3,
                name="Jeans",
                price=49.99,
                description="Stylish denim jeans",
                images=[
                    "https://avatar.vercel.sh/0x0",
                    "https://avatar.vercel.sh/0x1",
                    "https://avatar.vercel.sh/0x2",
                ],
            ),
        ]

        with Session(state["engine"]) as session:
            for cat in cats:
                session.add(cat)
            for prod in prods:
                session.add(prod)
            session.commit()

    yield

    state["engine"].dispose()


app = FastAPI(lifespan=lifespan, debug=DEBUG)


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


app.include_router(routes.root.router)
app.include_router(routes.categories.router)
app.include_router(routes.products.router)
