import logging
import time
from threading import Lock

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

# TTL cache — re-fetches warehouse data every 5 minutes so new ESPN
# syncs appear without restarting the API.
_BUNDLE_TTL = 300  # seconds
_bundle_cache: DataBundle | None = None
_bundle_loaded_at: float = 0.0
_bundle_lock = Lock()


def _bundle_is_stale() -> bool:
    return _bundle_cache is None or (time.monotonic() - _bundle_loaded_at) > _BUNDLE_TTL


def invalidate_bundle() -> None:
    """Force next request to re-fetch from the warehouse."""
    global _bundle_loaded_at
    _bundle_loaded_at = 0.0


def get_data_bundle() -> DataBundle:
    global _bundle_cache, _bundle_loaded_at
    if not _bundle_is_stale():
        return _bundle_cache  # type: ignore[return-value]
    with _bundle_lock:
        if not _bundle_is_stale():  # double-check inside lock
            return _bundle_cache  # type: ignore[return-value]
        bundle = _load_bundle()
        _bundle_cache = bundle
        _bundle_loaded_at = time.monotonic()
        return bundle


def _load_bundle() -> DataBundle:
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


def get_teams() -> list[Team]:
    return get_data_bundle().teams


def get_players() -> list[Player]:
    return get_data_bundle().players


def get_fixtures() -> list[Match]:
    return get_data_bundle().fixtures


def get_team_by_id(team_id: str) -> Team | None:
    return next((team for team in get_teams() if team.id == team_id), None)


def get_players_by_team(team_id: str) -> list[Player]:
    return [player for player in get_players() if player.teamId == team_id]


# Test and admin tools used to call lru_cache-style `.cache_clear()` methods.
# Keep that tiny compatibility layer while the repository uses a TTL cache.
get_data_bundle.cache_clear = invalidate_bundle  # type: ignore[attr-defined]
get_teams.cache_clear = invalidate_bundle  # type: ignore[attr-defined]
get_players.cache_clear = invalidate_bundle  # type: ignore[attr-defined]
get_fixtures.cache_clear = invalidate_bundle  # type: ignore[attr-defined]
