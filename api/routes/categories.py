from fastapi import APIRouter, Request, status
from sqlmodel import Session, select

from db import Category, CategoryBase, CategoryUpdate
from models.app import State
from models.errors import NotFoundException

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("/", status_code=status.HTTP_200_OK)
async def get_categories(request: Request) -> list[Category]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with Session(state["engine"]) as session:
        return list(session.exec(select(Category)).all())


@router.get(
    "/{category_id}",
    status_code=status.HTTP_200_OK,
    responses={status.HTTP_404_NOT_FOUND: {"description": "Category not found"}},
)
async def get_category(request: Request, category_id: int) -> Category:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with Session(state["engine"]) as session:
        category = session.get(Category, category_id)
        if not category:
            raise NotFoundException
        return category


@router.post("/", status_code=status.HTTP_201_CREATED)
async def new_category(request: Request, category: CategoryBase) -> Category:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with Session(state["engine"]) as session:
        db_category = Category.model_validate(category)
        session.add(db_category)
        session.commit()
        session.refresh(db_category)
        return db_category


@router.put("/{category_id}", status_code=status.HTTP_200_OK)
async def update_category(
    request: Request, category_id: int, category: CategoryUpdate
) -> Category:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with Session(state["engine"]) as session:
        db_category = session.get(Category, category_id)
        if not db_category:
            raise NotFoundException
        db_category.update_model(category)
        session.add(db_category)
        session.commit()
        session.refresh(db_category)
        return db_category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(request: Request, category_id: int) -> None:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with Session(state["engine"]) as session:
        category = session.get(Category, category_id)
        if not category:
            raise NotFoundException
        session.delete(category)
        session.commit()
