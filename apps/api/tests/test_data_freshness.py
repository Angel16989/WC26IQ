from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.settings import Settings
from app.data.providers import DataBundle
from app.schemas.common import Match, Player, Team
from app.services.data_freshness import build_data_freshness_report


def _settings(provider: str = "warehouse", live_score_mode: str = "not_configured") -> Settings:
    return Settings(
        environment="test",
        api_version="0.1.0",
        cors_origins=["http://localhost:3000"],
        data_provider=provider,
        sportsmonks_api_token=None,
        sportsmonks_world_cup_season_id=26618,
        statsbomb_competition_id=None,
        statsbomb_season_id=None,
        http_timeout_seconds=10.0,
        approved_formula_path=Path("unused"),
        approved_formula_min_score=0.82,
        database_url=None,
        database_auto_migrate=False,
        database_connect_timeout_seconds=3,
        warehouse_database_url=None,
        live_score_mode=live_score_mode,
        live_score_target_interval_seconds=3,
        freshness_match_window_minutes=150,
        freshness_final_grace_hours=4,
    )


def _team() -> Team:
    return Team(
        id="arg",
        name="Argentina",
        fifaCode="ARG",
        confederation="CONMEBOL",
        group="C",
        strengthRating=91.2,
        formIndex=88.0,
        squadStrength=89.4,
        lastFiveResults=["W", "W", "D", "W", "W"],
    )


def _player() -> Player:
    return Player(
        id="arg-10",
        teamId="arg",
        name="Lionel Messi",
        position="Centre Forward",
        club="Argentina National Team",
        clubFormIndex=94.0,
        goalThreat=0.74,
        likelyStarter=True,
    )


def test_freshness_flags_past_scheduled_fixture() -> None:
    report = build_data_freshness_report(
        DataBundle(
            teams=[_team()],
            players=[_player()],
            fixtures=[
                Match(
                    id="fixture-1",
                    homeTeamId="arg",
                    awayTeamId="jpn",
                    kickoffUtc="2026-06-15T18:00:00Z",
                    venue="MetLife Stadium",
                    stage="group",
                    group="C",
                    status="scheduled",
                )
            ],
        ),
        _settings(),
        now=datetime(2026, 6, 29, 10, 0, tzinfo=timezone.utc),
    )

    assert report.status == "stale"
    assert report.staleFixtures == 1
    assert any(issue.code == "past_scheduled_fixture" for issue in report.issues)


def test_freshness_endpoint_reports_mock_fixture_staleness(client: TestClient) -> None:
    response = client.get("/admin/data-freshness")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"stale", "unknown"}
    assert payload["fixtures"] >= 1
    assert any(issue["code"] == "past_scheduled_fixture" for issue in payload["issues"])
