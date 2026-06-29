from typing import Literal

from app.schemas.base import ApiModel


FreshnessStatus = Literal["fresh", "stale", "unknown"]
FreshnessSeverity = Literal["info", "warning", "critical"]


class DataFreshnessIssue(ApiModel):
    severity: FreshnessSeverity
    code: str
    message: str
    recommendation: str
    fixtureId: str | None = None
    source: str | None = None


class DataFreshnessReport(ApiModel):
    status: FreshnessStatus
    checkedAtUtc: str
    provider: str
    liveScoreMode: str
    liveScoreTargetIntervalSeconds: int
    teams: int
    players: int
    fixtures: int
    staleFixtures: int
    liveWindowFixtures: int
    nextKickoffUtc: str | None
    latestKickoffUtc: str | None
    issues: list[DataFreshnessIssue]
    nextActions: list[str]
