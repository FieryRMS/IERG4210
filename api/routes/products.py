import uuid

from fastapi import APIRouter, Request, status
from sqlmodel import col, select

from db import Category, Image, Product, ProductCreate, ProductUpdate
from models import NotFoundException
from models.app import State

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("/", status_code=status.HTTP_200_OK)
async def get_products(request: Request) -> list[Product]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    return list(session.exec(select(Product)).all())


@router.get("/{product_id}", status_code=status.HTTP_200_OK)
async def get_product(request: Request, product_id: uuid.UUID) -> Product:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    product = session.get(Product, product_id)
    if not product:
        raise NotFoundException
    return product


@router.get("/category/{category_id}", status_code=status.HTTP_200_OK)
async def get_products_by_category(
    request: Request, category_id: uuid.UUID
) -> list[Product]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    category = session.get(Category, category_id)
    if not category:
        raise NotFoundException
    return category.products


@router.post("/", status_code=status.HTTP_201_CREATED)
async def new_product(request: Request, product: ProductCreate) -> Product:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    db_product = Product.model_validate(product)
    images = session.exec(
        select(Image).where(col(Image.id).in_(product.images))
    ).all()
    db_product.images = list(images)
    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    return db_product


@router.put("/{product_id}", status_code=status.HTTP_200_OK)
async def update_product(
    request: Request, product_id: uuid.UUID, product: ProductUpdate
) -> Product:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    db_product = session.get(Product, product_id)
    if not db_product:
        raise NotFoundException
    db_product.update_model(product)
    images = session.exec(
        select(Image).where(col(Image.id).in_(product.images))
    ).all()
    db_product.images = list(images)
    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    return db_product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(request: Request, product_id: uuid.UUID) -> None:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    product = session.get(Product, product_id)
    if not product:
        raise NotFoundException
    session.delete(product)
    session.commit()
