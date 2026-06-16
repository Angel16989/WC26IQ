from fastapi import APIRouter

from app.schemas.simulation import (
    TournamentSimulationRequest,
    TournamentSimulationResponse,
)
from app.services.simulation_engine import simulate_tournament

router = APIRouter(tags=["simulation"])


@router.post("/simulate/tournament", response_model=TournamentSimulationResponse)
def create_tournament_simulation(
    request: TournamentSimulationRequest,
) -> TournamentSimulationResponse:
    return simulate_tournament(request)

