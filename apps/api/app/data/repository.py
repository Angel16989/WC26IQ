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
from app.schemas.common import Match, Player, Team

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_data_bundle() -> DataBundle:
    settings = get_settings()
    provider = settings.data_provider

    if provider == "mock":
        return MockDataProvider().load()

    if provider == "statsbomb":
        return StatsBombOpenDataProvider(settings).load()

    statsbomb_bundle: DataBundle | None = None
    statsbomb_error: DataProviderError | None = None
    try:
        statsbomb_bundle = StatsBombOpenDataProvider(settings).load()
    except DataProviderError as error:
        statsbomb_error = error

    if provider in {"auto", "sportsmonks"}:
        try:
            return SportsMonksWorldCupProvider(settings).load(analytics_bundle=statsbomb_bundle)
        except DataProviderError as error:
            logger.warning("SportsMonks World Cup provider unavailable, falling back: %s", error)

    if statsbomb_bundle is not None:
        return statsbomb_bundle

    if statsbomb_error is not None:
        logger.warning("StatsBomb provider unavailable, falling back to mock data: %s", statsbomb_error)

    return MockDataProvider().load()


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
