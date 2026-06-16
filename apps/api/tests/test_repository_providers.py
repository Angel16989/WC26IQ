from app.data.providers import DataBundle, DataProviderError
from app.data.repository import get_data_bundle
from app.schemas.common import Match, Player, Team


def _sample_bundle() -> DataBundle:
    return DataBundle(
        teams=[
            Team(
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
        ],
        players=[
            Player(
                id="arg-10",
                teamId="arg",
                name="Lionel Messi",
                position="Centre Forward",
                club="Argentina National Team",
                clubFormIndex=94.0,
                goalThreat=0.74,
                likelyStarter=True,
            )
        ],
        fixtures=[
            Match(
                id="fixture-1",
                homeTeamId="arg",
                awayTeamId="mex",
                kickoffUtc="2026-06-14T17:00:00Z",
                venue="Azteca",
                stage="group",
                group="C",
                status="scheduled",
            )
        ],
    )


def test_repository_falls_back_to_statsbomb_when_sportsmonks_is_unavailable(
    monkeypatch,
) -> None:
    monkeypatch.setenv("WORLDCUPIQ_DATA_PROVIDER", "auto")

    from app.core.settings import get_settings
    from app.data import repository

    sample_bundle = _sample_bundle()

    monkeypatch.setattr(
        repository.StatsBombOpenDataProvider,
        "load",
        lambda self: sample_bundle,
    )
    monkeypatch.setattr(
        repository.SportsMonksWorldCupProvider,
        "load",
        lambda self, analytics_bundle=None: (_ for _ in ()).throw(
            DataProviderError("missing world cup access")
        ),
    )

    get_settings.cache_clear()
    get_data_bundle.cache_clear()
    bundle = get_data_bundle()

    assert bundle.teams[0].id == "arg"
    assert bundle.players[0].name == "Lionel Messi"
    assert bundle.fixtures[0].id == "fixture-1"


def test_repository_uses_mock_provider_when_requested(monkeypatch) -> None:
    monkeypatch.setenv("WORLDCUPIQ_DATA_PROVIDER", "mock")

    from app.core.settings import get_settings

    get_settings.cache_clear()
    get_data_bundle.cache_clear()
    bundle = get_data_bundle()

    assert any(team.id == "arg" for team in bundle.teams)
    assert bundle.fixtures
