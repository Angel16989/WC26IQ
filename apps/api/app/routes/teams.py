from fastapi import APIRouter, HTTPException

from app.data.repository import get_players_by_team, get_team_by_id, get_teams
from app.schemas.common import Player, Team

router = APIRouter(tags=["teams"])


@router.get("/teams", response_model=list[Team])
def read_teams() -> list[Team]:
    return get_teams()


@router.get("/teams/{team_id}", response_model=Team)
def read_team(team_id: str) -> Team:
    team = get_team_by_id(team_id.lower())
    if team is None:
        raise HTTPException(status_code=404, detail=f"Team '{team_id}' not found.")
    return team


@router.get("/teams/{team_id}/players", response_model=list[Player])
def read_team_players(team_id: str) -> list[Player]:
    return get_players_by_team(team_id.lower())
