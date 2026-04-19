from fastapi import APIRouter, Request
from models import Health, State

router = APIRouter(tags=["root"])


@router.get("/health")
async def health_check(request: Request) -> Health:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    logger = state["logger"]
    logger.debug("Received health check request")
    return Health(status="ok")
