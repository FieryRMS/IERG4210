from fastapi import APIRouter, Request
from sqlmodel import Session, select

from db import Category, ProductBase
from db.shop import Product
from models import NotFoundException
from models.app import State

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("/")
async def get_products(request: Request) -> list[Product]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with Session(state["engine"]) as session:
        return list(session.exec(select(Product)).all())


@router.get("/{product_id}")
async def get_product(request: Request, product_id: str) -> Product:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with Session(state["engine"]) as session:
        product = session.get(Product, product_id)
        if not product:
            raise NotFoundException
        return product


@router.get("/category/{category_id}")
async def get_products_by_category(request: Request, category_id: str) -> list[Product]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with Session(state["engine"]) as session:
        category = session.get(Category, category_id)
        if not category:
            raise NotFoundException
        return category.products


@router.post("/")
async def new_product(request: Request, product: ProductBase) -> Product:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with Session(state["engine"]) as session:
        db_product = Product.model_validate(product)
        session.add(db_product)
        session.commit()
        session.refresh(db_product)
        return db_product


@router.put("/{product_id}")
async def update_product(
    request: Request, product_id: str, product: ProductBase
) -> Product:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with Session(state["engine"]) as session:
        db_product = session.get(Product, product_id)
        if not db_product:
            raise NotFoundException
        db_product.update_model(product)
        session.add(db_product)
        session.commit()
        session.refresh(db_product)
        return db_product


@router.delete("/{product_id}")
async def delete_product(request: Request, product_id: str) -> None:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with Session(state["engine"]) as session:
        product = session.get(Product, product_id)
        if not product:
            raise NotFoundException
        session.delete(product)
        session.commit()
        session.commit()
