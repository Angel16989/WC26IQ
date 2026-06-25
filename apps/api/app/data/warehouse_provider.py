"""
Reads live World Cup 2026 data from the wciq_warehouse Postgres data lake
(running on the tower PC, accessible via Tailscale).

Converts the warehouse schema into the app's Team / Player / Match types.
"""

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING, Literal

from app.data.providers import DataBundle, DataProviderError
from app.schemas.common import Match, Player, Team

if TYPE_CHECKING:
    from app.core.settings import Settings

try:
    import psycopg
except ImportError:
    psycopg = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)

_TEAM_METADATA: dict[str, dict] = {
    # Confederation lookup — supplement what is already in core.teams.raw_team
    "arg": "CONMEBOL", "bra": "CONMEBOL", "col": "CONMEBOL", "uru": "CONMEBOL",
    "ecu": "CONMEBOL", "par": "CONMEBOL", "per": "CONMEBOL",
    "fra": "UEFA", "ger": "UEFA", "esp": "UEFA", "eng": "UEFA", "por": "UEFA",
    "ned": "UEFA", "bel": "UEFA", "cro": "UEFA", "sui": "UEFA", "aut": "UEFA",
    "sco": "UEFA", "den": "UEFA", "hun": "UEFA", "pol": "UEFA", "nor": "UEFA",
    "swe": "UEFA", "cze": "UEFA", "bih": "UEFA", "slo": "UEFA", "svk": "UEFA",
    "tur": "UEFA", "ukr": "UEFA", "irl": "UEFA", "isl": "UEFA",
    "usa": "CONCACAF", "mex": "CONCACAF", "can": "CONCACAF", "pan": "CONCACAF",
    "cuw": "CONCACAF", "hai": "CONCACAF", "jam": "CONCACAF",
    "mar": "CAF", "sen": "CAF", "gha": "CAF", "egy": "CAF", "rsa": "CAF",
    "tun": "CAF", "alg": "CAF", "cod": "CAF", "civ": "CAF", "cpv": "CAF",
    "aus": "AFC", "jpn": "AFC", "kor": "AFC", "irn": "AFC", "ksa": "AFC",
    "qat": "AFC", "irq": "AFC", "jor": "AFC", "uzb": "AFC",
    "nzl": "OFC",
}


def _confederation(team_id: str, raw: dict) -> str:
    return _TEAM_METADATA.get(team_id) or raw.get("confederation", "Unknown")


def _standing(raw: dict) -> dict:
    return raw.get("standing", {})


def _last_five(raw: dict) -> list[Literal["W", "D", "L"]]:
    """Derive last-5 results from standing stats (wins/draws/losses)."""
    st = _standing(raw)
    played = st.get("played", 0) or 0
    if played == 0:
        return []
    w = st.get("won", 0) or 0
    d = st.get("drawn", 0) or 0
    l_ = st.get("lost", 0) or 0
    results: list[Literal["W", "D", "L"]] = (
        ["W"] * min(w, 5) + ["D"] * min(d, 5) + ["L"] * min(l_, 5)
    )
    return results[:5] or ["D"]


def _strength(raw: dict) -> float:
    st = _standing(raw)
    pts = float(st.get("points", 0) or 0)
    pos = float(st.get("position", 4) or 4)
    played = float(st.get("played", 1) or 1)
    ppg = pts / max(played, 1)
    # Scale to the same 45-97 range as the SportsMonks provider
    return max(45.0, min(97.0, 62.0 + ppg * 8.0 + max(0, 5 - pos) * 1.8))


def _form_index(raw: dict) -> float:
    st = _standing(raw)
    pts = float(st.get("points", 0) or 0)
    played = float(st.get("played", 1) or 1)
    ppg = pts / max(played, 1)
    return max(35.0, min(98.0, 50.0 + ppg * 6.5))


def _squad_strength(raw: dict) -> float:
    st = _standing(raw)
    pts = float(st.get("points", 0) or 0)
    pos = float(st.get("position", 4) or 4)
    played = float(st.get("played", 1) or 1)
    ppg = pts / max(played, 1)
    return max(45.0, min(96.0, 58.0 + ppg * 5.6 + max(0, 5 - pos) * 1.5))


def _map_status(raw_status: str | None) -> Literal["scheduled", "live", "final", "postponed"]:
    s = (raw_status or "").lower().replace(" ", "_")
    if "final" in s or "full_time" in s or "ft" in s:
        return "final"
    if "live" in s or "in_progress" in s or "half" in s:
        return "live"
    if "postponed" in s or "cancelled" in s:
        return "postponed"
    return "scheduled"


class WarehouseDataProvider:
    """Reads from the wciq_warehouse Postgres data lake via Tailscale."""

    def __init__(self, settings: Settings) -> None:
        if psycopg is None:
            raise DataProviderError("psycopg is not installed.")
        if not settings.warehouse_database_url:
            raise DataProviderError("WORLDCUPIQ_WAREHOUSE_URL is not configured.")
        self._url = settings.warehouse_database_url
        self._timeout = int(settings.database_connect_timeout_seconds)

    def _connect(self):
        return psycopg.connect(self._url, connect_timeout=self._timeout)

    def load(self) -> DataBundle:
        logger.info("Loading live data from wciq_warehouse …")
        try:
            with self._connect() as conn:
                teams = self._load_teams(conn)
                fixtures = self._load_fixtures(conn)
        except Exception as exc:
            raise DataProviderError(f"Warehouse load failed: {exc}") from exc

        logger.info(
            "Warehouse: %d teams, %d fixtures loaded",
            len(teams), len(fixtures),
        )
        return DataBundle(teams=teams, players=[], fixtures=fixtures)

    def _load_teams(self, conn) -> list[Team]:
        rows = conn.execute(
            """
            SELECT t.team_id, t.fifa_code, t.team_name, t.current_group_name, t.raw_team
            FROM core.teams t
            ORDER BY t.team_name
            """
        ).fetchall()

        teams: list[Team] = []
        for row in rows:
            team_id, fifa_code, name, group_name, raw_json = row
            raw = raw_json if isinstance(raw_json, dict) else json.loads(raw_json or "{}")
            teams.append(
                Team(
                    id=team_id,
                    name=name.title(),
                    fifaCode=fifa_code,
                    confederation=_confederation(team_id, raw),
                    group=group_name,
                    strengthRating=round(_strength(raw), 2),
                    formIndex=round(_form_index(raw), 2),
                    squadStrength=round(_squad_strength(raw), 2),
                    lastFiveResults=_last_five(raw),
                )
            )
        return teams

    def _load_fixtures(self, conn) -> list[Match]:
        rows = conn.execute(
            """
            SELECT
                f.fixture_id,
                f.home_team_id, f.away_team_id,
                f.kickoff_at, f.venue, f.city,
                f.stage, f.group_name,
                f.extraction_status,
                f.raw_fixture
            FROM core.fixtures f
            ORDER BY f.kickoff_at ASC NULLS LAST
            """
        ).fetchall()

        fixtures: list[Match] = []
        for row in rows:
            (
                fixture_id, home_id, away_id, kickoff,
                venue, city, stage, group_name,
                status_raw, raw_json,
            ) = row
            raw = raw_json if isinstance(raw_json, dict) else json.loads(raw_json or "{}")
            kickoff_str = (
                kickoff.isoformat().replace("+00:00", "Z")
                if kickoff else "1970-01-01T00:00:00Z"
            )
            status = _map_status(raw.get("status") or status_raw)
            venue_str = (
                f"{venue}, {city}".strip(", ")
                if venue else (city or "TBD")
            )

            # Coerce stage to a valid literal
            valid_stages = {"group", "round_of_16", "quarterfinal", "semifinal", "third_place", "final"}
            if stage not in valid_stages:
                stage = "group"

            fixtures.append(
                Match(
                    id=fixture_id,
                    homeTeamId=home_id,
                    awayTeamId=away_id,
                    kickoffUtc=kickoff_str,
                    venue=venue_str,
                    stage=stage,  # type: ignore[arg-type]
                    group=group_name,
                    status=status,
                )
            )
        return fixtures
