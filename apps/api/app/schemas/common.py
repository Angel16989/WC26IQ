from typing import Literal

from app.schemas.base import ApiModel


class HealthResponse(ApiModel):
    status: Literal["ok"]
    service: str
    version: str


class Team(ApiModel):
    id: str
    name: str
    fifaCode: str
    confederation: str
    group: str | None = None
    strengthRating: float
    formIndex: float
    squadStrength: float
    lastFiveResults: list[Literal["W", "D", "L"]]


class Player(ApiModel):
    id: str
    teamId: str
    name: str
    position: str
    club: str
    clubFormIndex: float
    goalThreat: float
    likelyStarter: bool


class Match(ApiModel):
    id: str
    homeTeamId: str
    awayTeamId: str
    kickoffUtc: str
    venue: str
    stage: Literal[
        "group",
        "round_of_16",
        "quarterfinal",
        "semifinal",
        "third_place",
        "final",
    ]
    group: str | None = None
    status: Literal["scheduled", "live", "final", "postponed"]


class GoalProjection(ApiModel):
    home: float
    away: float


class GroupTableRow(ApiModel):
    teamId: str
    teamName: str
    points: int
    played: int
    wins: int
    draws: int
    losses: int
    goalsFor: int
    goalsAgainst: int
    goalDifference: int
    qualificationStatus: Literal["projected_advance", "projected_eliminate"]


class GroupTable(ApiModel):
    group: str
    standings: list[GroupTableRow]


class TeamProbability(ApiModel):
    teamId: str
    teamName: str
    probability: float

