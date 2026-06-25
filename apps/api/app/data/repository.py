from functools import lru_cache
import logging

from app.core.settings import get_settings
from app.data.providers import (
    DataBundle,
    DataProviderError,
    MockDataProvider,
    SportsMonksWorldCupProvider,
    StatsBombOpenDataProvider,
)
from app.data.warehouse_provider import WarehouseDataProvider
from app.data.postgres_store import persist_data_bundle
from app.schemas.common import Match, Player, Team

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_data_bundle() -> DataBundle:
    settings = get_settings()
    provider = settings.data_provider

    if provider == "mock":
        return _with_persistence(MockDataProvider().load(), provider_name="mock")

    # ── Warehouse (live data lake on tower) — highest priority ────────────────
    if provider in {"auto", "warehouse"} and settings.warehouse_database_url:
        try:
            bundle = WarehouseDataProvider(settings).load()
            logger.info("Loaded live data from warehouse: %d teams, %d fixtures",
                        len(bundle.teams), len(bundle.fixtures))
            return _with_persistence(bundle, provider_name="warehouse")
        except DataProviderError as error:
            logger.warning("Warehouse provider failed, falling back: %s", error)

    if provider == "statsbomb":
        return _with_persistence(
            StatsBombOpenDataProvider(settings).load(),
            provider_name="statsbomb",
        )

    statsbomb_bundle: DataBundle | None = None
    statsbomb_error: DataProviderError | None = None
    try:
        statsbomb_bundle = StatsBombOpenDataProvider(settings).load()
    except DataProviderError as error:
        statsbomb_error = error

    if provider in {"auto", "sportsmonks"}:
        try:
            return _with_persistence(
                SportsMonksWorldCupProvider(settings).load(analytics_bundle=statsbomb_bundle),
                provider_name="sportsmonks",
            )
        except DataProviderError as error:
            logger.warning("SportsMonks World Cup provider unavailable, falling back: %s", error)

    if statsbomb_bundle is not None:
        return _with_persistence(statsbomb_bundle, provider_name="statsbomb")

    if statsbomb_error is not None:
        logger.warning("StatsBomb provider unavailable, falling back to mock data: %s", statsbomb_error)

    return _with_persistence(MockDataProvider().load(), provider_name="mock")


def _with_persistence(bundle: DataBundle, *, provider_name: str) -> DataBundle:
    persist_data_bundle(bundle, provider_name=provider_name)
    return bundle


@lru_cache(maxsize=1)
def get_teams() -> list[Team]:
    return get_data_bundle().teams


@lru_cache(maxsize=1)
def get_players() -> list[Player]:
    return get_data_bundle().players


@lru_cache(maxsize=1)
def get_fixtures() -> list[Match]:
    return get_data_bundle().fixtures


def get_team_by_id(team_id: str) -> Team | None:
    return next((team for team in get_teams() if team.id == team_id), None)


def get_players_by_team(team_id: str) -> list[Player]:
    return [player for player in get_players() if player.teamId == team_id]
