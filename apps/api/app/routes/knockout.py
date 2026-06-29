"""
/knockout and /scenarios endpoints.

Returns the current bracket state (real scores for completed matches,
team names + flag codes, and Poisson win-probability for upcoming ones)
plus 5 Monte Carlo winner scenarios.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.settings import get_settings
from app.data.repository import get_data_bundle
from app.services.tournament_engine import (
    _win_probabilities,
    generate_winner_scenarios,
)

router = APIRouter(tags=["knockout"])
logger = logging.getLogger(__name__)


# ── Pydantic response models ──────────────────────────────────────────────────

class TeamRef(BaseModel):
    id: str
    name: str
    fifaCode: str
    group: str | None = None


class BracketMatchOut(BaseModel):
    matchId: str
    stage: str
    kickoffUtc: str | None
    status: str
    home: TeamRef | None = None
    away: TeamRef | None = None
    homeScore: int | None = None
    awayScore: int | None = None
    # Poisson formula prediction (only when status == "scheduled")
    homeWinPct: float | None = None
    awayWinPct: float | None = None
    drawPct: float | None = None


class KeyMatch(BaseModel):
    stage: str
    opponentId: str
    opponentName: str
    opponentFifa: str
    winPct: float


class ScenarioOut(BaseModel):
    scenarioId: str
    title: str
    subtitle: str
    championId: str
    championName: str
    championFifa: str
    probability: float
    narrative: str
    keyMatches: list[KeyMatch]


class KnockoutResponse(BaseModel):
    totalCompleted: int
    totalScheduled: int
    bracket: list[BracketMatchOut]


class ScenariosResponse(BaseModel):
    scenarios: list[ScenarioOut]
    modelVersion: str
    note: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _read_score(raw: Any, key: str) -> int | None:
    try:
        v = raw.get(key) if isinstance(raw, dict) else None
        return int(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def _map_status(raw_status: str | None) -> str:
    s = (raw_status or "").lower().replace(" ", "_")
    if "full_time" in s or "full time" in s or "ft" == s.strip():
        return "final"
    if "live" in s or "in_progress" in s or "half" in s:
        return "live"
    if "postponed" in s or "cancel" in s:
        return "postponed"
    return "scheduled"


# ── Route handlers ─────────────────────────────────────────────────────────────

@router.get("/knockout", response_model=KnockoutResponse)
def get_knockout_bracket() -> KnockoutResponse:
    """
    Returns all knockout-stage matches (R32 through Final) with:
    - Real scores for completed matches
    - Poisson win-probabilities for upcoming matches
    """
    settings = get_settings()
    bundle = get_data_bundle()
    team_by_id = {t.id: t for t in bundle.teams}

    knockout_stages = {"round_of_16", "quarterfinal", "semifinal", "third_place", "final"}
    knockout_matches = [m for m in bundle.fixtures if m.stage in knockout_stages]

    # Fetch raw_fixture data directly from warehouse for scores
    raw_by_id: dict[str, dict] = {}
    if settings.warehouse_database_url:
        try:
            import psycopg
            with psycopg.connect(
                settings.warehouse_database_url,
                connect_timeout=settings.database_connect_timeout_seconds,
            ) as conn:
                match_ids = [m.id for m in knockout_matches]
                if match_ids:
                    rows = conn.execute(
                        "SELECT fixture_id, raw_fixture FROM core.fixtures WHERE fixture_id = ANY(%s)",
                        (match_ids,),
                    ).fetchall()
                    for r in rows:
                        fid, raw_json = r
                        raw_by_id[fid] = (
                            raw_json if isinstance(raw_json, dict)
                            else json.loads(raw_json or "{}")
                        )
        except Exception as exc:
            logger.warning("Could not fetch raw scores from warehouse: %s", exc)

    out: list[BracketMatchOut] = []
    completed = 0
    scheduled = 0

    for m in sorted(knockout_matches, key=lambda x: x.kickoffUtc or ""):
        raw = raw_by_id.get(m.id, {})
        raw_status = raw.get("status")
        status = _map_status(raw_status or m.status)

        home_score = _read_score(raw, "home_score")
        away_score = _read_score(raw, "away_score")

        home_team = team_by_id.get(m.homeTeamId)
        away_team = team_by_id.get(m.awayTeamId)

        home_win_pct = away_win_pct = draw_pct = None
        if home_team and away_team and status == "scheduled":
            ph, pd, pa = _win_probabilities(home_team, away_team, neutral=True)
            home_win_pct = round(ph * 100, 1)
            draw_pct = round(pd * 100, 1)
            away_win_pct = round(pa * 100, 1)

        if status == "final":
            completed += 1
        else:
            scheduled += 1

        out.append(BracketMatchOut(
            matchId=m.id,
            stage=m.stage,
            kickoffUtc=m.kickoffUtc,
            status=status,
            home=TeamRef(
                id=home_team.id,
                name=home_team.name.title(),
                fifaCode=home_team.fifaCode,
                group=home_team.group,
            ) if home_team else None,
            away=TeamRef(
                id=away_team.id,
                name=away_team.name.title(),
                fifaCode=away_team.fifaCode,
                group=away_team.group,
            ) if away_team else None,
            homeScore=home_score,
            awayScore=away_score,
            homeWinPct=home_win_pct,
            awayWinPct=away_win_pct,
            drawPct=draw_pct,
        ))

    return KnockoutResponse(
        totalCompleted=completed,
        totalScheduled=scheduled,
        bracket=out,
    )


@router.get("/scenarios", response_model=ScenariosResponse)
def get_winner_scenarios() -> ScenariosResponse:
    """
    Runs 8 000 Monte Carlo tournament simulations using the Poisson master
    formula and returns 5 distinct winner scenarios with probabilities.
    """
    scenarios = generate_winner_scenarios(n_simulations=8000)

    return ScenariosResponse(
        scenarios=[
            ScenarioOut(
                scenarioId=s.scenario_id,
                title=s.title,
                subtitle=s.subtitle,
                championId=s.champion_team_id,
                championName=s.champion_name,
                championFifa=s.champion_fifa,
                probability=s.probability,
                narrative=s.narrative,
                keyMatches=[
                    KeyMatch(
                        stage=km["stage"],
                        opponentId=km["opponent_id"],
                        opponentName=km["opponent_name"],
                        opponentFifa=km["opponent_fifa"],
                        winPct=km["win_pct"],
                    )
                    for km in s.key_matches
                ],
            )
            for s in scenarios
        ],
        modelVersion="worldcupiq-poisson-dc-v1",
        note=(
            "DC-corrected Poisson (Dixon-Coles 1997) calibrated on "
            "48-team WC 2026 strength/form/squad ratings. "
            "8 000 Monte Carlo iterations. Neutral-venue assumption for all knockout matches."
        ),
    )
