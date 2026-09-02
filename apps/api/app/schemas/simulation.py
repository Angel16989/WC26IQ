from typing import Literal

from pydantic import Field

from app.schemas.base import ApiModel
from app.schemas.common import GroupTable, TeamProbability


class TournamentSimulationRequest(ApiModel):
    iterations: int = Field(default=1000, ge=1, le=10_000)
    seed: int = Field(default=2026, ge=0, le=2_147_483_647)
    startingStage: Literal[
        "group",
        "round_of_16",
        "quarterfinal",
        "semifinal",
        "third_place",
        "final",
    ] = "group"


class TournamentSimulationResponse(ApiModel):
    iterations: int
    seed: int
    startingStage: str
    winnerProbabilities: list[TeamProbability]
    finalists: list[TeamProbability]
    semiFinalists: list[TeamProbability]
    projectedGroupTables: list[GroupTable]
    notes: list[str]

