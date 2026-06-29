"""
GET /matches/{match_id}  — full match detail with goal scorers, stats, events.

Fetches from ESPN's summary API on demand (fast, ~300 ms).
match_id is our warehouse fixture_id, e.g. "espn-760415".
The ESPN event ID is everything after the first hyphen.
"""

from __future__ import annotations

import logging
import re
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.settings import get_settings
from app.data.repository import get_data_bundle

router  = APIRouter(tags=["matches"])
logger  = logging.getLogger(__name__)

ESPN_SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary"


# ── Response models ────────────────────────────────────────────────────────

class KeyEvent(BaseModel):
    clock: str | None
    eventType: str | None      # Goal, Yellow Card, Red Card, Substitution …
    teamName: str | None
    teamId: str | None
    playerName: str | None
    text: str | None           # full description sentence


class StatRow(BaseModel):
    label: str
    home: str | None
    away: str | None


class TeamMatchInfo(BaseModel):
    id: str
    name: str
    fifaCode: str
    score: int | None


class MatchDetailResponse(BaseModel):
    matchId: str
    stage: str
    status: str
    kickoffUtc: str | None
    venue: str | None
    home: TeamMatchInfo | None
    away: TeamMatchInfo | None
    keyEvents: list[KeyEvent]
    stats: list[StatRow]
    goals: list[KeyEvent]          # filtered subset of keyEvents (Goals only)
    homeLineup: list[dict]         # players from warehouse by position
    awayLineup: list[dict]


# ── Helpers ────────────────────────────────────────────────────────────────

def _extract_espn_id(match_id: str) -> str | None:
    """espn-760415 → 760415"""
    m = re.match(r"espn-(\d+)", match_id)
    return m.group(1) if m else None


def _parse_key_events(data: dict) -> list[KeyEvent]:
    events: list[KeyEvent] = []
    for ev in data.get("keyEvents", []):
        etype = ev.get("type", {}).get("text") or ""
        participants = ev.get("participants") or []
        player_name = ""
        if participants:
            player_name = (participants[0].get("athlete") or {}).get("displayName") or ""
        team = ev.get("team") or {}
        events.append(KeyEvent(
            clock=ev.get("clock", {}).get("displayValue"),
            eventType=etype,
            teamName=team.get("displayName"),
            teamId=team.get("id"),
            playerName=player_name or None,
            text=(ev.get("text") or "")[:220] or None,
        ))
    return events


def _parse_stats(data: dict, home_name: str, away_name: str) -> list[StatRow]:
    teams = data.get("boxscore", {}).get("teams", [])
    if len(teams) < 2:
        return []

    # ESPN returns home then away (usually)
    # Match by displayName
    home_stats: dict[str, str] = {}
    away_stats: dict[str, str] = {}

    for team_block in teams:
        t_name = team_block.get("team", {}).get("displayName", "")
        is_home = (home_name.lower() in t_name.lower()) or (t_name.lower() in home_name.lower())
        stat_map = home_stats if is_home else away_stats
        for s in team_block.get("statistics", []):
            label = s.get("label") or s.get("name") or ""
            stat_map[label] = s.get("displayValue") or ""

    labels_order = [
        "Possession", "SHOTS", "ON GOAL", "Corner Kicks",
        "Fouls", "Yellow Cards", "Red Cards", "Saves",
    ]
    rows: list[StatRow] = []
    seen: set[str] = set()
    for label in labels_order:
        for key in list(home_stats.keys()) + list(away_stats.keys()):
            if key not in seen and label.lower() in key.lower():
                rows.append(StatRow(label=key, home=home_stats.get(key), away=away_stats.get(key)))
                seen.add(key)
    return rows


def _build_lineup(team_id: str) -> list[dict]:
    """Return players from warehouse sorted by position for a pitch display."""
    from app.data.repository import get_players
    pos_order = {"GK": 0, "DEF": 1, "MID": 2, "FWD": 3}
    players = [p for p in get_players() if p.teamId == team_id]
    sorted_players = sorted(players, key=lambda p: (pos_order.get(p.position[:3].upper(), 9), -p.goalThreat))
    return [
        {
            "id": p.id,
            "name": p.name,
            "position": p.position,
            "club": p.club,
            "goalThreat": p.goalThreat,
            "likelyStarter": p.likelyStarter,
        }
        for p in sorted_players[:23]
    ]


# ── Route ──────────────────────────────────────────────────────────────────

@router.get("/matches/{match_id}", response_model=MatchDetailResponse)
def get_match_detail(match_id: str) -> MatchDetailResponse:
    espn_id = _extract_espn_id(match_id)
    if not espn_id:
        raise HTTPException(status_code=404, detail=f"Unknown match format: {match_id}")

    # Find fixture in bundle
    bundle = get_data_bundle()
    team_by_id = {t.id: t for t in bundle.teams}
    fixture = next((f for f in bundle.fixtures if f.id == match_id), None)
    if not fixture:
        raise HTTPException(status_code=404, detail=f"Match {match_id} not found.")

    home_team = team_by_id.get(fixture.homeTeamId)
    away_team = team_by_id.get(fixture.awayTeamId)

    # Fetch ESPN summary
    settings = get_settings()
    espn_data: dict[str, Any] = {}
    try:
        resp = httpx.get(
            ESPN_SUMMARY,
            params={"event": espn_id},
            timeout=settings.http_timeout_seconds,
            headers={"Accept-Encoding": "identity"},
        )
        resp.raise_for_status()
        espn_data = resp.json()
    except Exception as exc:
        logger.warning("ESPN summary fetch failed for %s: %s", espn_id, exc)

    # Parse key events
    key_events = _parse_key_events(espn_data)
    goals = [e for e in key_events if "goal" in (e.eventType or "").lower()]

    # Parse stats
    home_name = home_team.name if home_team else ""
    away_name = away_team.name if away_team else ""
    stats = _parse_stats(espn_data, home_name, away_name)

    # Scores from ESPN header
    header_comps = (espn_data.get("header", {}).get("competitions") or [{}])[0]
    competitors   = header_comps.get("competitors") or []
    home_score: int | None = None
    away_score: int | None = None
    for comp in competitors:
        home_away = comp.get("homeAway", "")
        try:
            score = int(comp.get("score") or -1)
        except (ValueError, TypeError):
            score = -1
        if home_away == "home" and score >= 0:
            home_score = score
        elif home_away == "away" and score >= 0:
            away_score = score

    status = header_comps.get("status", {}).get("type", {}).get("description") or fixture.status

    return MatchDetailResponse(
        matchId=match_id,
        stage=fixture.stage,
        status=status,
        kickoffUtc=fixture.kickoffUtc,
        venue=fixture.venue,
        home=TeamMatchInfo(
            id=home_team.id if home_team else fixture.homeTeamId,
            name=home_team.name.title() if home_team else fixture.homeTeamId,
            fifaCode=home_team.fifaCode if home_team else "???",
            score=home_score,
        ) if home_team or True else None,
        away=TeamMatchInfo(
            id=away_team.id if away_team else fixture.awayTeamId,
            name=away_team.name.title() if away_team else fixture.awayTeamId,
            fifaCode=away_team.fifaCode if away_team else "???",
            score=away_score,
        ) if away_team or True else None,
        keyEvents=key_events,
        stats=stats,
        goals=goals,
        homeLineup=_build_lineup(fixture.homeTeamId),
        awayLineup=_build_lineup(fixture.awayTeamId),
    )
