from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from app.core.settings import get_settings
from app.services.master_formula import MASTER_FORMULA_NAME

if TYPE_CHECKING:
    from app.data.providers import DataBundle
    from app.schemas.prediction import MatchPredictionRequest, MatchPredictionResponse

try:
    import psycopg
    from psycopg.types.json import Jsonb
except ImportError:  # pragma: no cover - exercised only when Postgres is enabled.
    psycopg = None
    Jsonb = None

logger = logging.getLogger(__name__)

APP_SCHEMA_SQL = """
create table if not exists teams (
  id text primary key,
  name text not null,
  fifa_code text not null unique,
  confederation text not null,
  group_name text,
  strength_rating numeric(6,3),
  form_index numeric(6,3),
  squad_strength numeric(6,3),
  last_five_results jsonb not null default '[]'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists players (
  id text primary key,
  team_id text not null references teams(id),
  name text not null,
  position text not null,
  club text,
  club_form_index numeric(6,3),
  goal_threat numeric(6,3),
  likely_starter boolean not null default false,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists fixtures (
  id text primary key,
  home_team_id text not null references teams(id),
  away_team_id text not null references teams(id),
  kickoff_utc timestamptz not null,
  venue text,
  tournament_stage text not null,
  group_name text,
  status text not null default 'scheduled',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists data_sync_runs (
  id bigserial primary key,
  provider_name text not null,
  team_count integer not null,
  player_count integer not null,
  fixture_count integer not null,
  synced_at timestamptz not null default now()
);

create table if not exists predictions (
  id text primary key,
  match_id text references fixtures(id),
  home_team_id text not null references teams(id),
  away_team_id text not null references teams(id),
  model_name text not null,
  model_version text not null,
  home_win_probability numeric(7,6) not null,
  draw_probability numeric(7,6) not null,
  away_win_probability numeric(7,6) not null,
  expected_goals_home numeric(6,3),
  expected_goals_away numeric(6,3),
  confidence_label text,
  explanation text,
  likely_scorers jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  formula_snapshot jsonb not null default '{}'::jsonb,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);

create table if not exists match_results (
  id bigserial primary key,
  fixture_id text not null references fixtures(id),
  home_goals integer not null,
  away_goals integer not null,
  result_status text not null default 'final',
  recorded_at timestamptz not null default now()
);

create table if not exists model_runs (
  id text primary key,
  prediction_id text references predictions(id) on delete cascade,
  model_name text not null,
  model_version text not null,
  input_snapshot jsonb not null default '{}'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

alter table if exists teams add column if not exists last_five_results jsonb not null default '[]'::jsonb;
alter table if exists teams add column if not exists raw_payload jsonb not null default '{}'::jsonb;
alter table if exists teams add column if not exists updated_at timestamptz not null default now();
alter table if exists players add column if not exists raw_payload jsonb not null default '{}'::jsonb;
alter table if exists players add column if not exists updated_at timestamptz not null default now();
alter table if exists fixtures add column if not exists raw_payload jsonb not null default '{}'::jsonb;
alter table if exists fixtures add column if not exists updated_at timestamptz not null default now();
alter table if exists predictions alter column match_id drop not null;
alter table if exists predictions add column if not exists home_team_id text references teams(id);
alter table if exists predictions add column if not exists away_team_id text references teams(id);
alter table if exists predictions add column if not exists model_name text;
alter table if exists predictions add column if not exists likely_scorers jsonb not null default '[]'::jsonb;
alter table if exists predictions add column if not exists notes jsonb not null default '[]'::jsonb;
alter table if exists predictions add column if not exists formula_snapshot jsonb not null default '{}'::jsonb;
alter table if exists predictions add column if not exists request_payload jsonb not null default '{}'::jsonb;
alter table if exists predictions add column if not exists response_payload jsonb not null default '{}'::jsonb;
"""


def persist_data_bundle(bundle: DataBundle, *, provider_name: str) -> None:
    settings = get_settings()
    if not settings.database_url:
        return

    try:
        with _connect(settings.database_url) as connection:
            _ensure_schema(connection)
            _upsert_teams(connection, bundle.teams)
            _upsert_players(connection, bundle.players)
            _upsert_fixtures(connection, bundle.fixtures)
            connection.execute(
                """
                insert into data_sync_runs
                (provider_name, team_count, player_count, fixture_count)
                values (%s, %s, %s, %s)
                """,
                (provider_name, len(bundle.teams), len(bundle.players), len(bundle.fixtures)),
            )
    except Exception as error:  # pragma: no cover - needs a live Postgres URL.
        logger.warning("Postgres data persistence skipped: %s", error)


def persist_prediction(
    request: MatchPredictionRequest,
    response: MatchPredictionResponse,
    *,
    formula_snapshot: dict[str, Any],
) -> None:
    settings = get_settings()
    if not settings.database_url:
        return

    request_payload = request.model_dump(mode="json")
    response_payload = response.model_dump(mode="json")
    prediction_id = f"pred_{uuid4().hex}"
    model_run_id = f"model_run_{uuid4().hex}"

    try:
        with _connect(settings.database_url) as connection:
            _ensure_schema(connection)
            connection.execute(
                """
                insert into predictions (
                  id,
                  home_team_id,
                  away_team_id,
                  model_name,
                  model_version,
                  home_win_probability,
                  draw_probability,
                  away_win_probability,
                  expected_goals_home,
                  expected_goals_away,
                  confidence_label,
                  explanation,
                  likely_scorers,
                  notes,
                  formula_snapshot,
                  request_payload,
                  response_payload
                )
                values (
                  %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                  %s, %s
                )
                """,
                (
                    prediction_id,
                    request.homeTeamId,
                    request.awayTeamId,
                    MASTER_FORMULA_NAME,
                    response.modelVersion,
                    response.homeWinProbability,
                    response.drawProbability,
                    response.awayWinProbability,
                    response.expectedGoals.home,
                    response.expectedGoals.away,
                    response.confidence,
                    response.explanation,
                    _jsonb(response_payload["likelyScorers"]),
                    _jsonb(response_payload.get("notes", [])),
                    _jsonb(formula_snapshot),
                    _jsonb(request_payload),
                    _jsonb(response_payload),
                ),
            )
            connection.execute(
                """
                insert into model_runs (
                  id,
                  prediction_id,
                  model_name,
                  model_version,
                  input_snapshot,
                  output_summary,
                  notes
                )
                values (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    model_run_id,
                    prediction_id,
                    MASTER_FORMULA_NAME,
                    response.modelVersion,
                    _jsonb(
                        {
                            "request": request_payload,
                            "formula": formula_snapshot,
                        }
                    ),
                    _jsonb(
                        {
                            "probabilities": {
                                "homeWin": response.homeWinProbability,
                                "draw": response.drawProbability,
                                "awayWin": response.awayWinProbability,
                            },
                            "expectedGoals": response.expectedGoals.model_dump(mode="json"),
                            "confidence": response.confidence,
                        }
                    ),
                    "Saved from the /predict/match backend endpoint.",
                ),
            )
    except Exception as error:  # pragma: no cover - needs a live Postgres URL.
        logger.warning("Postgres prediction persistence skipped: %s", error)


def _connect(database_url: str):
    if psycopg is None:
        raise RuntimeError("psycopg is not installed. Run pip install -r apps/api/requirements.txt.")

    settings = get_settings()
    return psycopg.connect(
        database_url,
        connect_timeout=settings.database_connect_timeout_seconds,
    )


def _ensure_schema(connection: Any) -> None:
    if get_settings().database_auto_migrate:
        for statement in APP_SCHEMA_SQL.split(";"):
            clean_statement = statement.strip()
            if clean_statement:
                connection.execute(clean_statement)


def _upsert_teams(connection: Any, teams: list[Any]) -> None:
    rows = [
        (
            team.id,
            team.name,
            team.fifaCode,
            team.confederation,
            team.group,
            team.strengthRating,
            team.formIndex,
            team.squadStrength,
            _jsonb(team.lastFiveResults),
            _jsonb(team.model_dump(mode="json")),
        )
        for team in teams
    ]
    if not rows:
        return

    with connection.cursor() as cursor:
        cursor.executemany(
            """
            insert into teams (
              id,
              name,
              fifa_code,
              confederation,
              group_name,
              strength_rating,
              form_index,
              squad_strength,
              last_five_results,
              raw_payload
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            on conflict (id) do update set
              name = excluded.name,
              fifa_code = excluded.fifa_code,
              confederation = excluded.confederation,
              group_name = excluded.group_name,
              strength_rating = excluded.strength_rating,
              form_index = excluded.form_index,
              squad_strength = excluded.squad_strength,
              last_five_results = excluded.last_five_results,
              raw_payload = excluded.raw_payload,
              updated_at = now()
            """,
            rows,
        )


def _upsert_players(connection: Any, players: list[Any]) -> None:
    rows = [
        (
            player.id,
            player.teamId,
            player.name,
            player.position,
            player.club,
            player.clubFormIndex,
            player.goalThreat,
            player.likelyStarter,
            _jsonb(player.model_dump(mode="json")),
        )
        for player in players
    ]
    if not rows:
        return

    with connection.cursor() as cursor:
        cursor.executemany(
            """
            insert into players (
              id,
              team_id,
              name,
              position,
              club,
              club_form_index,
              goal_threat,
              likely_starter,
              raw_payload
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            on conflict (id) do update set
              team_id = excluded.team_id,
              name = excluded.name,
              position = excluded.position,
              club = excluded.club,
              club_form_index = excluded.club_form_index,
              goal_threat = excluded.goal_threat,
              likely_starter = excluded.likely_starter,
              raw_payload = excluded.raw_payload,
              updated_at = now()
            """,
            rows,
        )


def _upsert_fixtures(connection: Any, fixtures: list[Any]) -> None:
    rows = [
        (
            fixture.id,
            fixture.homeTeamId,
            fixture.awayTeamId,
            fixture.kickoffUtc,
            fixture.venue,
            fixture.stage,
            fixture.group,
            fixture.status,
            _jsonb(fixture.model_dump(mode="json")),
        )
        for fixture in fixtures
    ]
    if not rows:
        return

    with connection.cursor() as cursor:
        cursor.executemany(
            """
            insert into fixtures (
              id,
              home_team_id,
              away_team_id,
              kickoff_utc,
              venue,
              tournament_stage,
              group_name,
              status,
              raw_payload
            )
            values (%s, %s, %s, %s::timestamptz, %s, %s, %s, %s, %s)
            on conflict (id) do update set
              home_team_id = excluded.home_team_id,
              away_team_id = excluded.away_team_id,
              kickoff_utc = excluded.kickoff_utc,
              venue = excluded.venue,
              tournament_stage = excluded.tournament_stage,
              group_name = excluded.group_name,
              status = excluded.status,
              raw_payload = excluded.raw_payload,
              updated_at = now()
            """,
            rows,
        )


def _jsonb(value: object) -> object:
    if Jsonb is None:
        return value
    return Jsonb(value)
