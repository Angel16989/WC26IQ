from typing import Literal

from app.schemas.base import ApiModel
from app.schemas.common import GoalProjection
from pydantic import Field


class MatchPredictionRequest(ApiModel):
    homeTeamId: str = Field(min_length=1, max_length=64)
    awayTeamId: str = Field(min_length=1, max_length=64)
    includeLikelyScorers: bool = True
    includeModelNotes: bool = True


class MatchReference(ApiModel):
    homeTeamId: str
    awayTeamId: str
    homeTeamName: str
    awayTeamName: str


class LikelyScorerPrediction(ApiModel):
    playerId: str
    name: str
    teamId: str
    probability: float


class MatchPredictionResponse(ApiModel):
    match: MatchReference
    homeWinProbability: float
    drawProbability: float
    awayWinProbability: float
    expectedGoals: GoalProjection
    likelyScorers: list[LikelyScorerPrediction]
    confidence: Literal["low", "medium", "high"]
    modelVersion: str
    explanation: str
    notes: list[str] = Field(default_factory=list)
