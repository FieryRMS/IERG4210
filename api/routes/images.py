import uuid

from fastapi import APIRouter, Request, status
from sqlmodel import Session, select

from db import Image, ImageBase
from models.app import State
from models.errors import NotFoundException

router = APIRouter(prefix="/images", tags=["Images"])


@router.get("/", status_code=status.HTTP_200_OK)
async def get_images(request: Request) -> list[Image]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with Session(state["engine"]) as session:
        return list(session.exec(select(Image)).all())


@router.get("/{image_id}", status_code=status.HTTP_200_OK)
async def get_image(request: Request, image_id: uuid.UUID) -> Image:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with Session(state["engine"]) as session:
        image = session.get(Image, image_id)
        if not image:
            raise NotFoundException
        return image


@router.post("/", status_code=status.HTTP_201_CREATED)
async def new_image(request: Request, image: ImageBase) -> Image:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with Session(state["engine"]) as session:
        db_image = Image.model_validate(image)
        session.add(db_image)
        session.commit()
        session.refresh(db_image)
        return db_image


@router.put("/{image_id}", status_code=status.HTTP_200_OK)
async def update_image(
    request: Request, image_id: uuid.UUID, image: ImageBase
) -> Image:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with Session(state["engine"]) as session:
        db_image = session.get(Image, image_id)
        if not db_image:
            raise NotFoundException
        db_image.update_model(image)
        session.add(db_image)
        session.commit()
        session.refresh(db_image)
        return db_image


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(request: Request, image_id: uuid.UUID) -> None:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    with Session(state["engine"]) as session:
        image = session.get(Image, image_id)
        if not image:
            raise NotFoundException
        session.delete(image)
        session.commit()
