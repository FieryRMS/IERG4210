import uuid

from fastapi import APIRouter, Request, status
from models import Image, ImageCreate, ImageUpdate, Role, ServerNotFoundException, State
from sqlmodel import select

from .users import with_user

router = APIRouter(prefix="/images", tags=["Images"])

# TODO: type request states when fastapi merges https://github.com/fastapi/fastapi/pull/14863


@router.get("/", status_code=status.HTTP_200_OK)
async def get_images(request: Request) -> list[Image]:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    return list(session.exec(select(Image)).all())


@router.get("/{image_id}", status_code=status.HTTP_200_OK)
async def get_image(request: Request, image_id: uuid.UUID) -> Image:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    image = session.get(Image, image_id)
    if not image:
        raise ServerNotFoundException
    return image


@router.post("/", status_code=status.HTTP_201_CREATED)
@with_user(roles=[Role.admin])
async def new_image(request: Request, image: ImageCreate) -> Image:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    db_image = Image.model_validate(image)
    session.add(db_image)
    session.commit()
    session.refresh(db_image)
    return db_image


@router.patch("/", status_code=status.HTTP_200_OK)
@with_user(roles=[Role.admin])
async def update_image(
    request: Request, image: ImageUpdate
) -> Image:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    db_image = session.get(Image, image.id)
    if not db_image:
        raise ServerNotFoundException
    db_image.update_model(image)
    session.add(db_image)
    session.commit()
    session.refresh(db_image)
    return db_image


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
@with_user(roles=[Role.admin])
async def delete_image(request: Request, id: uuid.UUID):
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    session = state["session"]
    image = session.get(Image, id)
    if not image:
        raise ServerNotFoundException
    session.delete(image)
    session.commit()
