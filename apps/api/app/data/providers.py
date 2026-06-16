from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import re
from typing import Any

import httpx

from app.core.settings import Settings
from app.data.team_metadata import lookup_team_metadata, normalise_text
from app.schemas.common import Match, Player, Team

logger = logging.getLogger(__name__)

ROOT_DATA_DIR = Path(__file__).resolve().parents[4] / "data"
STATSBOMB_BASE_URL = "https://raw.githubusercontent.com/statsbomb/open-data/master/data"
SPORTSMONKS_BASE_URL = "https://api.sportmonks.com/v3/football"


@dataclass(frozen=True)
class DataBundle:
    teams: list[Team]
    players: list[Player]
    fixtures: list[Match]


class DataProviderError(RuntimeError):
    pass


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(value, upper))


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", normalise_text(value))
    return slug.strip("-") or "team"


def _team_identity(name: str, short_code: str | None = None) -> tuple[str, str, str]:
    metadata = lookup_team_metadata(name, short_code)
    fifa_code = (short_code or (metadata.fifa_code if metadata else None) or _slugify(name)[:3]).upper()
    confederation = metadata.confederation if metadata else "Unknown"
    return fifa_code.lower(), fifa_code, confederation


def _stage_from_name(value: str | None) -> str:
    normalised = normalise_text(value or "")

    if "group" in normalised:
        return "group"
    if "roundof16" in normalised:
        return "round_of_16"
    if "quarter" in normalised:
        return "quarterfinal"
    if "semi" in normalised:
        return "semifinal"
    if "thirdplace" in normalised or "playoffforthirdplace" in normalised:
        return "third_place"
    return "final"


def _iso_timestamp(date_part: str | None, time_part: str | None = None) -> str:
    clean_date = (date_part or "1970-01-01").strip()
    clean_time = (time_part or "00:00:00").strip().split(".")[0]
    if "T" in clean_date:
        return clean_date.replace(" ", "T") + ("Z" if not clean_date.endswith("Z") else "")

    return f"{clean_date}T{clean_time}Z"


def _parse_clock(value: str | None) -> int:
    if not value:
        return 0

    minutes, seconds = value.split(":")
    return (int(minutes) * 60) + int(seconds)


def _clean_group_name(value: str | None) -> str | None:
    if not value:
        return None

    match = re.search(r"group\s+([a-z])", value, flags=re.IGNORECASE)
    if match:
        return match.group(1).upper()

    return value.strip()


def _load_local_json(filename: str) -> list[dict[str, Any]]:
    file_path = ROOT_DATA_DIR / filename
    with file_path.open("r", encoding="utf-8") as file:
        return json.load(file)


class MockDataProvider:
    def load(self) -> DataBundle:
        return DataBundle(
            teams=[Team.model_validate(item) for item in _load_local_json("mock-teams.json")],
            players=[Player.model_validate(item) for item in _load_local_json("mock-players.json")],
            fixtures=[Match.model_validate(item) for item in _load_local_json("mock-fixtures.json")],
        )


class StatsBombOpenDataProvider:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.timeout = settings.http_timeout_seconds

    def load(self) -> DataBundle:
        competition_id, season_id = self._select_competition_season()
        matches = self._fetch_json(f"matches/{competition_id}/{season_id}.json")
        if not matches:
            raise DataProviderError("StatsBomb returned no matches for the configured season.")

        lineups_by_match = self._fetch_match_payloads(
            "lineups", [match["match_id"] for match in matches]
        )
        events_by_match = self._fetch_match_payloads("events", [match["match_id"] for match in matches])

        teams, players = self._build_team_and_player_models(matches, lineups_by_match, events_by_match)
        fixtures = self._build_fixtures(matches)
        return DataBundle(teams=teams, players=players, fixtures=fixtures)

    def _fetch_json(self, path: str) -> Any:
        url = f"{STATSBOMB_BASE_URL}/{path}"
        response = httpx.get(url, timeout=self.timeout)
        response.raise_for_status()
        return response.json()

    def _fetch_match_payloads(self, folder: str, match_ids: list[int]) -> dict[int, Any]:
        workers = min(8, max(2, len(match_ids) // 8 or 2))

        def fetch(match_id: int) -> tuple[int, Any]:
            return match_id, self._fetch_json(f"{folder}/{match_id}.json")

        with ThreadPoolExecutor(max_workers=workers) as executor:
            return dict(executor.map(fetch, match_ids))

    def _select_competition_season(self) -> tuple[int, int]:
        if (
            self.settings.statsbomb_competition_id is not None
            and self.settings.statsbomb_season_id is not None
        ):
            return (
                self.settings.statsbomb_competition_id,
                self.settings.statsbomb_season_id,
            )

        competitions = self._fetch_json("competitions.json")
        candidates = [
            item
            for item in competitions
            if item.get("competition_name") == "FIFA World Cup"
            and item.get("competition_gender") == "male"
        ]
        if not candidates:
            raise DataProviderError("StatsBomb World Cup competitions are unavailable.")

        def sort_key(item: dict[str, Any]) -> int:
            season_name = str(item.get("season_name", "0"))
            match = re.search(r"\d{4}", season_name)
            return int(match.group()) if match else 0

        selected = max(candidates, key=sort_key)
        return int(selected["competition_id"]), int(selected["season_id"])

    def _build_team_and_player_models(
        self,
        matches: list[dict[str, Any]],
        lineups_by_match: dict[int, Any],
        events_by_match: dict[int, Any],
    ) -> tuple[list[Team], list[Player]]:
        team_rows: dict[str, dict[str, Any]] = {}
        player_rows: dict[tuple[str, int], dict[str, Any]] = {}
        team_name_by_id: dict[str, str] = {}
        team_match_count: Counter[str] = Counter()

        for match in sorted(matches, key=self._match_sort_key):
            home_team = match["home_team"]
            away_team = match["away_team"]
            home_team_id, home_fifa, home_confed = _team_identity(home_team["home_team_name"])
            away_team_id, away_fifa, away_confed = _team_identity(away_team["away_team_name"])

            team_name_by_id[home_team_id] = home_team["home_team_name"]
            team_name_by_id[away_team_id] = away_team["away_team_name"]

            home_row = team_rows.setdefault(
                home_team_id,
                {
                    "id": home_team_id,
                    "name": home_team["home_team_name"],
                    "fifaCode": home_fifa,
                    "confederation": home_confed,
                    "group": None,
                    "points": 0,
                    "goals_for": 0,
                    "goals_against": 0,
                    "xg_for": 0.0,
                    "xg_against": 0.0,
                    "results": [],
                    "roster": set(),
                },
            )
            away_row = team_rows.setdefault(
                away_team_id,
                {
                    "id": away_team_id,
                    "name": away_team["away_team_name"],
                    "fifaCode": away_fifa,
                    "confederation": away_confed,
                    "group": None,
                    "points": 0,
                    "goals_for": 0,
                    "goals_against": 0,
                    "xg_for": 0.0,
                    "xg_against": 0.0,
                    "results": [],
                    "roster": set(),
                },
            )

            home_row["group"] = home_row["group"] or _clean_group_name(home_team.get("home_team_group"))
            away_row["group"] = away_row["group"] or _clean_group_name(away_team.get("away_team_group"))

            home_score = int(match.get("home_score") or 0)
            away_score = int(match.get("away_score") or 0)
            home_result = "W" if home_score > away_score else "D" if home_score == away_score else "L"
            away_result = "W" if away_score > home_score else "D" if home_score == away_score else "L"

            home_points = 3 if home_result == "W" else 1 if home_result == "D" else 0
            away_points = 3 if away_result == "W" else 1 if away_result == "D" else 0
            team_match_count[home_team_id] += 1
            team_match_count[away_team_id] += 1

            events = events_by_match.get(match["match_id"], [])
            xg_by_team = defaultdict(float)
            for event in events:
                if event.get("type", {}).get("name") != "Shot":
                    continue

                team_name = event.get("team", {}).get("name")
                if not team_name:
                    continue

                team_id, _, _ = _team_identity(team_name)
                xg_by_team[team_id] += float(event.get("shot", {}).get("statsbomb_xg") or 0.0)

                player = event.get("player") or {}
                player_id = player.get("id")
                if player_id is None:
                    continue

                player_key = (team_id, int(player_id))
                player_row = player_rows.setdefault(
                    player_key,
                    self._empty_player_row(team_id=team_id, player_id=int(player_id), name=player.get("name")),
                )
                player_row["shots"] += 1
                player_row["xg"] += float(event.get("shot", {}).get("statsbomb_xg") or 0.0)
                if event.get("shot", {}).get("outcome", {}).get("name") == "Goal":
                    player_row["goals"] += 1

            for event in events:
                if event.get("type", {}).get("name") != "Pass" or not event.get("pass", {}).get(
                    "goal_assist"
                ):
                    continue

                team_name = event.get("team", {}).get("name")
                player = event.get("player") or {}
                player_id = player.get("id")
                if not team_name or player_id is None:
                    continue

                team_id, _, _ = _team_identity(team_name)
                player_key = (team_id, int(player_id))
                player_row = player_rows.setdefault(
                    player_key,
                    self._empty_player_row(team_id=team_id, player_id=int(player_id), name=player.get("name")),
                )
                player_row["assists"] += 1

            home_row["points"] += home_points
            away_row["points"] += away_points
            home_row["goals_for"] += home_score
            home_row["goals_against"] += away_score
            away_row["goals_for"] += away_score
            away_row["goals_against"] += home_score
            home_row["xg_for"] += xg_by_team[home_team_id]
            home_row["xg_against"] += xg_by_team[away_team_id]
            away_row["xg_for"] += xg_by_team[away_team_id]
            away_row["xg_against"] += xg_by_team[home_team_id]
            home_row["results"].append(home_result)
            away_row["results"].append(away_result)

            lineup_rows = lineups_by_match.get(match["match_id"], [])
            for lineup_team in lineup_rows:
                team_id, _, _ = _team_identity(lineup_team["team_name"])
                team_rows.setdefault(team_id, home_row if team_id == home_team_id else away_row)

                for lineup_player in lineup_team.get("lineup", []):
                    player_id = int(lineup_player["player_id"])
                    player_key = (team_id, player_id)
                    player_row = player_rows.setdefault(
                        player_key,
                        self._empty_player_row(
                            team_id=team_id,
                            player_id=player_id,
                            name=lineup_player.get("player_name"),
                        ),
                    )
                    player_row["name"] = lineup_player.get("player_name") or player_row["name"]
                    team_rows[team_id]["roster"].add(player_id)

                    positions = lineup_player.get("positions") or []
                    if positions:
                        player_row["appearances"] += 1

                    if any(position.get("start_reason") == "Starting XI" for position in positions):
                        player_row["starts"] += 1

                    for position in positions:
                        label = position.get("position") or "Unknown"
                        duration = _parse_clock(position.get("to")) - _parse_clock(position.get("from"))
                        player_row["position_minutes"][label] += max(duration, 1)

        players = self._build_player_models(player_rows, team_name_by_id, team_match_count)
        players_by_team: defaultdict[str, list[Player]] = defaultdict(list)
        for player in players:
            players_by_team[player.teamId].append(player)

        teams: list[Team] = []
        for team_row in sorted(team_rows.values(), key=lambda item: item["name"]):
            matches_played = max(team_match_count[team_row["id"]], 1)
            goal_diff = team_row["goals_for"] - team_row["goals_against"]
            xg_diff = team_row["xg_for"] - team_row["xg_against"]
            points_per_match = team_row["points"] / matches_played

            strength_rating = _clamp(
                58.0 + (points_per_match * 10.0) + ((goal_diff / matches_played) * 7.0) + ((xg_diff / matches_played) * 6.0),
                45.0,
                98.0,
            )

            recent_results = team_row["results"][-5:] or ["D"]
            recent_points = sum(3 if result == "W" else 1 if result == "D" else 0 for result in recent_results)
            form_index = _clamp(40.0 + (recent_points * 4.0), 35.0, 99.0)

            starter_threats = sorted(
                [player.goalThreat for player in players_by_team[team_row["id"]] if player.likelyStarter],
                reverse=True,
            )
            average_starter_threat = (
                sum(starter_threats[:8]) / min(len(starter_threats[:8]), 8)
                if starter_threats
                else 0.3
            )
            squad_strength = _clamp(48.0 + (average_starter_threat * 45.0), 45.0, 97.0)

            teams.append(
                Team(
                    id=team_row["id"],
                    name=team_row["name"],
                    fifaCode=team_row["fifaCode"],
                    confederation=team_row["confederation"],
                    group=team_row["group"],
                    strengthRating=round(strength_rating, 1),
                    formIndex=round(form_index, 1),
                    squadStrength=round(squad_strength, 1),
                    lastFiveResults=recent_results[-5:],
                )
            )

        return teams, players

    def _empty_player_row(self, team_id: str, player_id: int, name: str | None) -> dict[str, Any]:
        return {
            "team_id": team_id,
            "player_id": player_id,
            "name": name or f"Player {player_id}",
            "appearances": 0,
            "starts": 0,
            "shots": 0,
            "goals": 0,
            "assists": 0,
            "xg": 0.0,
            "position_minutes": Counter(),
        }

    def _build_player_models(
        self,
        player_rows: dict[tuple[str, int], dict[str, Any]],
        team_name_by_id: dict[str, str],
        team_match_count: Counter[str],
    ) -> list[Player]:
        likely_starters: dict[str, set[int]] = defaultdict(set)
        players_by_team: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
        for player_row in player_rows.values():
            players_by_team[player_row["team_id"]].append(player_row)

        for team_id, team_players in players_by_team.items():
            ordered_players = sorted(
                team_players,
                key=lambda item: (
                    item["starts"],
                    item["appearances"],
                    sum(item["position_minutes"].values()),
                    item["shots"] + item["goals"] + item["assists"],
                ),
                reverse=True,
            )
            likely_starters[team_id] = {
                player_row["player_id"] for player_row in ordered_players[:11] if player_row["starts"] > 0
            }

        players: list[Player] = []
        for player_row in sorted(player_rows.values(), key=lambda item: (item["team_id"], item["name"])):
            team_id = player_row["team_id"]
            minutes_played = sum(player_row["position_minutes"].values())
            dominant_position = (
                player_row["position_minutes"].most_common(1)[0][0]
                if player_row["position_minutes"]
                else "Unknown"
            )
            goal_threat = _clamp(
                (player_row["shots"] * 0.04)
                + (player_row["xg"] * 0.22)
                + (player_row["goals"] * 0.18)
                + (player_row["assists"] * 0.08),
                0.05,
                0.95,
            )
            team_matches = max(team_match_count[team_id], 1)
            club_form_index = _clamp(
                42.0
                + (player_row["starts"] * 4.5)
                + (player_row["goals"] * 8.0)
                + (player_row["assists"] * 4.0)
                + (player_row["xg"] * 10.0)
                + ((minutes_played / team_matches) / 90.0 * 6.0),
                35.0,
                99.0,
            )
            team_name = team_name_by_id.get(team_id, "National Team")

            players.append(
                Player(
                    id=f"{team_id}-{player_row['player_id']}",
                    teamId=team_id,
                    name=player_row["name"],
                    position=dominant_position,
                    club=f"{team_name} National Team",
                    clubFormIndex=round(club_form_index, 1),
                    goalThreat=round(goal_threat, 2),
                    likelyStarter=player_row["player_id"] in likely_starters[team_id],
                )
            )

        return players

    def _build_fixtures(self, matches: list[dict[str, Any]]) -> list[Match]:
        fixtures: list[Match] = []

        for match in sorted(matches, key=self._match_sort_key):
            home_team_id, _, _ = _team_identity(match["home_team"]["home_team_name"])
            away_team_id, _, _ = _team_identity(match["away_team"]["away_team_name"])
            fixtures.append(
                Match(
                    id=f"statsbomb-{match['match_id']}",
                    homeTeamId=home_team_id,
                    awayTeamId=away_team_id,
                    kickoffUtc=_iso_timestamp(match.get("match_date"), match.get("kick_off")),
                    venue=match.get("stadium", {}).get("name") or "World Cup Venue",
                    stage=_stage_from_name(match.get("competition_stage", {}).get("name")),
                    group=_clean_group_name(match["home_team"].get("home_team_group")),
                    status="final",
                )
            )

        return fixtures

    def _match_sort_key(self, match: dict[str, Any]) -> tuple[str, str, int]:
        return (
            str(match.get("match_date", "")),
            str(match.get("kick_off", "")),
            int(match.get("match_id", 0)),
        )


class SportsMonksWorldCupProvider:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.timeout = settings.http_timeout_seconds

    def load(self, analytics_bundle: DataBundle | None = None) -> DataBundle:
        if not self.settings.sportsmonks_api_token:
            raise DataProviderError("SPORTSMONK_API is not configured.")

        season_id = self.settings.sportsmonks_world_cup_season_id
        standings = self._request_json(
            f"standings/seasons/{season_id}",
            params={"include": "participant;group"},
        ).get("data", [])
        schedule = self._request_json(f"schedules/seasons/{season_id}").get("data", [])

        if not standings or not schedule:
            raise DataProviderError(
                "SportsMonks World Cup 2026 season data is unavailable for the current plan."
            )

        baseline_team_by_code: dict[str, Team] = {}
        baseline_team_by_name: dict[str, Team] = {}
        baseline_players: list[Player] = []
        if analytics_bundle is not None:
            baseline_team_by_code = {team.fifaCode: team for team in analytics_bundle.teams}
            baseline_team_by_name = {
                normalise_text(team.name): team for team in analytics_bundle.teams
            }
            baseline_players = analytics_bundle.players

        teams: list[Team] = []
        team_groups: dict[str, str | None] = {}
        team_ids: set[str] = set()

        for row in standings:
            participant = row.get("participant") or {}
            name = participant.get("name")
            if not name:
                continue

            team_id, fifa_code, confederation = _team_identity(name, participant.get("short_code"))
            baseline_team = baseline_team_by_code.get(fifa_code) or baseline_team_by_name.get(
                normalise_text(name)
            )
            group = _clean_group_name((row.get("group") or {}).get("name"))
            team_groups[team_id] = group
            team_ids.add(team_id)

            if baseline_team is not None:
                strength_rating = baseline_team.strengthRating
                form_index = baseline_team.formIndex
                squad_strength = baseline_team.squadStrength
                last_five_results = baseline_team.lastFiveResults
                confederation = baseline_team.confederation
            else:
                points = float(row.get("points") or 0)
                position = float(row.get("position") or 4)
                strength_rating = _clamp(62.0 + (points * 2.2) + max(0.0, 5.0 - position) * 1.8, 45.0, 97.0)
                form_index = _clamp(50.0 + (points * 1.6), 35.0, 98.0)
                squad_strength = _clamp(58.0 + (points * 1.4) + max(0.0, 5.0 - position) * 1.5, 45.0, 96.0)
                last_five_results = ["D", "D", "D", "D", "D"]

            teams.append(
                Team(
                    id=team_id,
                    name=name,
                    fifaCode=fifa_code,
                    confederation=confederation,
                    group=group,
                    strengthRating=round(strength_rating, 1),
                    formIndex=round(form_index, 1),
                    squadStrength=round(squad_strength, 1),
                    lastFiveResults=last_five_results,
                )
            )

        fixtures: list[Match] = []
        now = datetime.now(timezone.utc)
        for stage in schedule:
            stage_name = stage.get("name")
            mapped_stage = _stage_from_name(stage_name)
            for round_row in stage.get("rounds", []):
                for fixture in round_row.get("fixtures", []):
                    participants = fixture.get("participants") or []
                    participant_lookup = {
                        (participant.get("meta") or {}).get("location"): participant
                        for participant in participants
                    }
                    home_participant = participant_lookup.get("home")
                    away_participant = participant_lookup.get("away")
                    if home_participant is None or away_participant is None:
                        continue

                    home_team_id, _, _ = _team_identity(
                        home_participant["name"], home_participant.get("short_code")
                    )
                    away_team_id, _, _ = _team_identity(
                        away_participant["name"], away_participant.get("short_code")
                    )
                    kickoff_utc = _iso_timestamp(fixture.get("starting_at"))
                    kickoff_time = datetime.fromisoformat(kickoff_utc.replace("Z", "+00:00"))
                    status = "scheduled"
                    if fixture.get("result_info"):
                        status = "final"
                    elif kickoff_time <= now:
                        status = "live"

                    inferred_group = None
                    if mapped_stage == "group":
                        home_group = team_groups.get(home_team_id)
                        away_group = team_groups.get(away_team_id)
                        if home_group and home_group == away_group:
                            inferred_group = home_group

                    fixtures.append(
                        Match(
                            id=f"sportsmonks-{fixture['id']}",
                            homeTeamId=home_team_id,
                            awayTeamId=away_team_id,
                            kickoffUtc=kickoff_utc,
                            venue=(fixture.get("venue") or {}).get("name")
                            or str(fixture.get("venue_id") or "TBD"),
                            stage=mapped_stage,
                            group=inferred_group,
                            status=status,
                        )
                    )

        players = [player for player in baseline_players if player.teamId in team_ids]
        if not teams or not fixtures:
            raise DataProviderError("SportsMonks returned incomplete World Cup season data.")

        return DataBundle(
            teams=sorted(teams, key=lambda team: (team.group or "ZZZ", team.name)),
            players=sorted(players, key=lambda player: (player.teamId, player.name)),
            fixtures=sorted(fixtures, key=lambda fixture: fixture.kickoffUtc),
        )

    def _request_json(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        query = {"api_token": self.settings.sportsmonks_api_token}
        if params:
            query.update(params)

        response = httpx.get(
            f"{SPORTSMONKS_BASE_URL}/{path}",
            params=query,
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json()
