from typing import Literal

from app.schemas.base import ApiModel
from app.schemas.common import GroupTable, TeamProbability


class TournamentSimulationRequest(ApiModel):
    iterations: int = 1000
    seed: int = 2026
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

