import logging
import os
from collections.abc import Callable
from contextlib import asynccontextmanager
from typing import Any

import dotenv
from fastapi import FastAPI, Request, Response
from fastapi.routing import APIRoute
from sqlalchemy import create_engine
from sqlmodel import Session as SQLSession, SQLModel

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
                name="Smartphone",
                price=699.99,
                description="Latest model smartphone with advanced features",
                category=cats[0],
                images=[
                    Image(
                        url="https://avatar.vercel.sh/smartphone.png",
                        alt="Smartphone front view",
                    ),
                    Image(
                        url="https://avatar.vercel.sh/smartphone-back.png",
                        alt="Smartphone back view",
                    ),
                    Image(
                        url="https://avatar.vercel.sh/smartphone-side.png",
                        alt="Smartphone side view",
                    ),
                ],
            ),
            Product(
                name="Laptop",
                price=1299.99,
                description="High-performance laptop for work and gaming",
                category=cats[0],
                images=[
                    Image(
                        url="https://avatar.vercel.sh/laptop.png",
                        alt="Laptop front view",
                    ),
                    Image(
                        url="https://avatar.vercel.sh/laptop-side.png",
                        alt="Laptop side view",
                    ),
                ],
            ),
            Product(
                name="Novel",
                price=19.99,
                description="Bestselling fiction novel",
                category=cats[1],
                images=[
                    Image(
                        url="https://avatar.vercel.sh/novel.png",
                        alt="Novel cover",
                    ),
                ],
            ),
            Product(
                name="Textbook",
                price=89.99,
                description="Comprehensive textbook for students",
                category=cats[1],
                images=[
                    Image(
                        url="https://avatar.vercel.sh/textbook.png",
                        alt="Textbook cover",
                    ),
                ],
            ),
            Product(
                name="T-shirt",
                price=12.99,
                description="Comfortable cotton t-shirt",
                category=cats[2],
                images=[
                    Image(
                        url="https://avatar.vercel.sh/tshirt.png",
                        alt="T-shirt front view",
                    ),
                    Image(
                        url="https://avatar.vercel.sh/tshirt-back.png",
                        alt="T-shirt back view",
                    ),
                ],
            ),
            Product(
                name="Jeans",
                price=49.99,
                description="Stylish denim jeans",
                category=cats[2],
                images=[
                    Image(
                        url="https://avatar.vercel.sh/jeans.png",
                        alt="Jeans front view",
                    ),
                    Image(
                        url="https://avatar.vercel.sh/jeans-back.png",
                        alt="Jeans back view",
                    ),
                ],
            ),
        ]

        with SQLSession(state["engine"]) as session:
            for prod in prods:
                session.add(prod)
            session.commit()

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