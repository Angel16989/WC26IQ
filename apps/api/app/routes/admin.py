from fastapi import APIRouter
from pydantic import BaseModel

from app.core.settings import get_settings
from app.data.repository import get_data_bundle, invalidate_bundle
from app.schemas.freshness import DataFreshnessReport
from app.services.data_freshness import build_data_freshness_report

router = APIRouter(tags=["admin"])


class RefreshResponse(BaseModel):
    status: str
    teams: int
    players: int
    fixtures: int


@router.post("/admin/refresh", response_model=RefreshResponse)
def force_refresh() -> RefreshResponse:
    """Invalidate the data cache and reload from the warehouse immediately."""
    invalidate_bundle()
    bundle = get_data_bundle()
    return RefreshResponse(
        status="refreshed",
        teams=len(bundle.teams),
        players=len(bundle.players),
        fixtures=len(bundle.fixtures),
    )


@router.get("/admin/status", response_model=RefreshResponse)
def cache_status() -> RefreshResponse:
    """Return current cache contents without forcing a reload."""
    bundle = get_data_bundle()
    return RefreshResponse(
        status="ok",
        teams=len(bundle.teams),
        players=len(bundle.players),
        fixtures=len(bundle.fixtures),
    )


@router.get("/admin/data-freshness", response_model=DataFreshnessReport)
def data_freshness() -> DataFreshnessReport:
    """Check whether the loaded football data looks current enough to trust."""
    return build_data_freshness_report(get_data_bundle(), get_settings())
