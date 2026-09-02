from fastapi import APIRouter

from app.core.settings import get_settings
from app.schemas.common import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def read_health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        service="worldcupiq-api",
        version=settings.api_version,
    )

