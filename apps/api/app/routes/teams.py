from fastapi import APIRouter

from app.data.repository import get_teams
from app.schemas.common import Team

router = APIRouter(tags=["teams"])


@router.get("/teams", response_model=list[Team])
def read_teams() -> list[Team]:
    return get_teams()

