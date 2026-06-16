from fastapi import APIRouter

from app.data.repository import get_fixtures
from app.schemas.common import Match

router = APIRouter(tags=["fixtures"])


@router.get("/fixtures", response_model=list[Match])
def read_fixtures() -> list[Match]:
    return get_fixtures()

