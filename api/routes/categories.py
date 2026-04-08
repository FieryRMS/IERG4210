import uuid

from fastapi import APIRouter, Request, status
from sqlmodel import select

from db import Category, CategoryCreate, CategoryUpdate
from models.app import State
from models.errors import ServerNotFoundException
from .users import with_role

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("/", status_code=status.HTTP_200_OK)
async def get_categories(request: Request) -> list[Category]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    return list(session.exec(select(Category)).all())


@router.get(
    "/{category_id}",
    status_code=status.HTTP_200_OK,
    responses={status.HTTP_404_NOT_FOUND: {"description": "Category not found"}},
)
async def get_category(request: Request, category_id: uuid.UUID) -> Category:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    category = session.get(Category, category_id)
    if not category:
        raise ServerNotFoundException
    return category


@router.post("/", status_code=status.HTTP_201_CREATED)
@with_role(["admin"])
async def new_category(request: Request, category: CategoryCreate) -> Category:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    db_category = Category.model_validate(category)
    session.add(db_category)
    session.commit()
    session.refresh(db_category)
    return db_category


@router.put("/", status_code=status.HTTP_200_OK)
@with_role(["admin"])
async def update_category(
    request: Request, category: CategoryUpdate
) -> Category:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    db_category = session.get(Category, category.id)
    if not db_category:
        raise ServerNotFoundException
    db_category.update_model(category)
    session.add(db_category)
    session.commit()
    session.refresh(db_category)
    return db_category


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
@with_role(["admin"])
async def delete_category(request: Request, id: uuid.UUID):
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    category = session.get(Category, id)
    if not category:
        raise ServerNotFoundException
    session.delete(category)
    session.commit()
