from fastapi import APIRouter, Request
from models.app import State
from sqlmodel import Session

router = APIRouter(prefix="/products", tags=["Products"])
