from fastapi import FastAPI
from contextlib import asynccontextmanager
from pydantic import BaseModel


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    yield
    print("Shutting down...")


app = FastAPI(lifespan=lifespan)


class Health(BaseModel):
    status: str


@app.get("/health")
async def health_check() -> Health:
    return Health(status="ok")
