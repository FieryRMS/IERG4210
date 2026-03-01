from fastapi import APIRouter, Request
from models.app import State
from models.routes.root import Health

router = APIRouter()

@router.get("/health")
async def health_check(request: Request) -> Health:
    state: State = request.state  # pyright: ignore[reportAssignmentType]
    logger = state["logger"]
    logger.debug("Received health check request")
    return Health(status="ok")
