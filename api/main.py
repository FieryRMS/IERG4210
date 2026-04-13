import logging
import os
from collections.abc import Callable
from contextlib import asynccontextmanager
from time import time
from typing import Any

import dotenv
import paypal_orders
import requests
import routes
from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.routing import APIRoute
from models import *
from pydantic import TypeAdapter
from sqlmodel import Session as SQLSession
from sqlmodel import create_engine

dotenv.load_dotenv()  # Load environment variables from .env file

DEBUG = os.getenv("EXE_MODE", "prod") == "dev"
POSTGRES_URL = os.getenv("POSTGRES_URL")

config = paypal_orders.Configuration(
    host=os.getenv("PAYPAL_API_BASE_URL", "https://api-m.sandbox.paypal.com"),
    username=os.getenv("O_AUTH_CLIENT_ID"),
    password=os.getenv("O_AUTH_CLIENT_SECRET"),
)


class ColoredFormatter(logging.Formatter):
    _LEVEL_COLORS = {
        logging.DEBUG: ("\033[46m", "\033[36m"),  # cyan
        logging.INFO: ("\033[42m", "\033[32m"),  # green
        logging.WARNING: ("\033[43m", "\033[33m"),  # yellow
        logging.ERROR: ("\033[41m", "\033[31m"),  # red
        logging.CRITICAL: ("\033[1;41m", "\033[1;31m"),  # bold red
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
        bcolor, fcolor = self._LEVEL_COLORS.get(
            record.levelno, (self._RESET, self._RESET)
        )
        ts = f"{self._DIM}[{self.formatTime(record, self.datefmt)}]{self._RESET}"
        level = f"{bcolor}[{record.levelname}]{self._RESET}"
        name = f"{self._name_color(record.name)}[{record.name}]{self._RESET}"
        message = f"{fcolor}{record.getMessage()}{self._RESET}"
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
        app.openapi()  # check if openapi can be generated at startup

    api_client = paypal_orders.ApiClient(config)
    state["paypal_config"] = config
    state["OrdersApi"] = paypal_orders.OrdersApi(api_client)
    state["authorization"] = Authorization(
        access_token="",
        token_type="",
        app_id="",
        expires_in=0,
        nonce="",
    )

    state["logger"].info("API started")
    yield
    state["engine"].dispose()
    state["logger"].info("API stopped")


def custom_generate_unique_id(route: APIRoute):
    return f"{route.tags[0]}-{route.name}"


errs: list[type[ServerException]] = [*ServerException.__subclasses__(), ServerException]

app = FastAPI(
    lifespan=lifespan,
    debug=DEBUG,
    generate_unique_id=custom_generate_unique_id,
    responses={
        err.STATUS_CODE: {"description": err.desc(), "model": err} for err in errs
    },
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> Response:
    errs = exc.errors()
    errdict: dict[str, list[Any]] = {}
    for err in errs:
        path = [
            f"[{l}]" if isinstance(l, int) else l for l in err["loc"] if l != "body"
        ]
        err["loc"] = path
        loc = ".".join(err["loc"])
        if loc not in errdict:
            errdict[loc] = []
        errdict[loc].append(err)

    adapter = TypeAdapter(ServerValidationException)
    obj = adapter.validate_python(
        {
            "errors": {
                "form": errdict,
                "fields": errdict,
            }
        }
    )
    return Response(
        content=adapter.dump_json(obj),
        status_code=obj.code,
        media_type="application/json",
    )


@app.exception_handler(ServerException)
async def http_exception_handler(request: Request, exc: ServerException) -> Response:
    adapter = TypeAdapter(exc.__class__)
    return Response(
        content=adapter.dump_json(exc),
        status_code=exc.code,
        media_type="application/json",
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> Response:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    state["logger"].error(f"Unhandled exception: {exc}", exc_info=exc)
    adapter = TypeAdapter(ServerException)
    obj = ServerException()
    return Response(
        content=adapter.dump_json(obj),
        status_code=obj.code,
        media_type="application/json",
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
    request.state["paypal_config"] = appstate["paypal_config"]
    request.state["OrdersApi"] = appstate["OrdersApi"]
    request.state["authorization"] = appstate["authorization"]
    res = await call_next(request)
    request.state["session"].close()
    return res


@app.middleware("http")
async def refresh_paypal_token(
    request: Request[State], call_next: Callable[..., Any]
) -> Response:
    state: State = request.app.state
    auth: Authorization = state["authorization"]
    if auth.expires_in + auth.created_at < time():
        state["logger"].info("Refreshing PayPal access token")
        config = state["paypal_config"]
        response = requests.post(
            f"{config.host}/v1/oauth2/token",
            auth=(config.username or "", config.password or ""),
            data={"grant_type": "client_credentials"},
        )
        if response.status_code == 200:
            state["authorization"] = Authorization(**response.json())
            state[
                "OrdersApi"
            ].api_client.set_default_header(  # pyright: ignore[reportUnknownMemberType]
                "Authorization",
                f"Bearer {state['authorization'].access_token}",
            )
            state["logger"].info("PayPal access token refreshed")
        else:
            state["logger"].error(
                f"Failed to refresh PayPal access token: {response.status_code} {response.text}"
            )
    return await call_next(request)


app.include_router(routes.root.router)
app.include_router(routes.categories.router)
app.include_router(routes.products.router)
app.include_router(routes.images.router)
app.include_router(routes.users.router)
app.include_router(routes.orders.router)
