from dataclasses import dataclass
from functools import lru_cache
import os
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    environment: str
    api_version: str
    cors_origins: list[str]
    data_provider: str
    sportsmonks_api_token: str | None
    sportsmonks_world_cup_season_id: int | None
    statsbomb_competition_id: int | None
    statsbomb_season_id: int | None
    http_timeout_seconds: float
    approved_formula_path: Path
    approved_formula_min_score: float
    database_url: str | None
    database_auto_migrate: bool
    database_connect_timeout_seconds: int
    warehouse_database_url: str | None
    live_score_mode: str
    live_score_target_interval_seconds: int
    freshness_match_window_minutes: int
    freshness_final_grace_hours: float


PROJECT_ROOT = Path(__file__).resolve().parents[4]
API_ROOT = Path(__file__).resolve().parents[2]


def _load_env_file(path: Path, *, override: bool = False) -> None:
    if not path.is_file():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        if override or key not in os.environ:
            os.environ[key] = value


def _load_runtime_env_files() -> None:
    if os.getenv("WORLDCUPIQ_SKIP_ENV_FILES", "").strip().lower() in {"1", "true", "yes", "on"}:
        return

    _load_env_file(PROJECT_ROOT / ".env.example")
    _load_env_file(API_ROOT / ".env.example")
    _load_env_file(PROJECT_ROOT / ".env")
    _load_env_file(PROJECT_ROOT / ".env.local", override=True)
    _load_env_file(API_ROOT / ".env", override=True)
    _load_env_file(API_ROOT / ".env.local", override=True)


def _read_optional_int(name: str) -> int | None:
    raw_value = os.getenv(name)
    if raw_value is None or not raw_value.strip():
        return None

    return int(raw_value.strip())


def _read_optional_float(name: str, default: float) -> float:
    raw_value = os.getenv(name)
    if raw_value is None or not raw_value.strip():
        return default

    return float(raw_value.strip())


def _read_optional_bool(name: str, default: bool) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None or not raw_value.strip():
        return default

    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


def _read_path(name: str, default: Path) -> Path:
    raw_value = os.getenv(name)
    if raw_value is None or not raw_value.strip():
        return default

    path = Path(raw_value.strip()).expanduser()
    return path if path.is_absolute() else PROJECT_ROOT / path


@lru_cache
def get_settings() -> Settings:
    _load_runtime_env_files()
    raw_origins = os.getenv("WORLDCUPIQ_CORS_ORIGINS", "http://localhost:3000")
    cors_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    sportsmonks_api_token = os.getenv("SPORTSMONK_API") or os.getenv("SPORTSMONKS_API_TOKEN")
    database_url = os.getenv("WORLDCUPIQ_DATABASE_URL") or os.getenv("DATABASE_URL")

    return Settings(
        environment=os.getenv("WORLDCUPIQ_ENV", "development"),
        api_version=os.getenv("WORLDCUPIQ_API_VERSION", "0.1.0"),
        cors_origins=cors_origins or ["http://localhost:3000"],
        data_provider=os.getenv("WORLDCUPIQ_DATA_PROVIDER", "auto").strip().lower(),
        sportsmonks_api_token=sportsmonks_api_token.strip() if sportsmonks_api_token else None,
        sportsmonks_world_cup_season_id=_read_optional_int("SPORTSMONKS_WORLDCUP_SEASON_ID")
        or 26618,
        statsbomb_competition_id=_read_optional_int("WORLDCUPIQ_STATSBOMB_COMPETITION_ID"),
        statsbomb_season_id=_read_optional_int("WORLDCUPIQ_STATSBOMB_SEASON_ID"),
        http_timeout_seconds=_read_optional_float("WORLDCUPIQ_HTTP_TIMEOUT_SECONDS", 10.0),
        approved_formula_path=_read_path(
            "WORLDCUPIQ_APPROVED_FORMULA_PATH",
            API_ROOT / "app" / "data" / "approved_formula.json",
        ),
        approved_formula_min_score=_read_optional_float("WORLDCUPIQ_APPROVED_FORMULA_MIN_SCORE", 0.82),
        database_url=database_url.strip() if database_url and database_url.strip() else None,
        database_auto_migrate=_read_optional_bool("WORLDCUPIQ_DATABASE_AUTO_MIGRATE", True),
        database_connect_timeout_seconds=int(
            _read_optional_float("WORLDCUPIQ_DATABASE_CONNECT_TIMEOUT_SECONDS", 3)
        ),
        warehouse_database_url=(
            os.getenv("WORLDCUPIQ_WAREHOUSE_URL", "").strip() or None
        ),
        live_score_mode=os.getenv("WORLDCUPIQ_LIVE_SCORE_MODE", "not_configured").strip().lower(),
        live_score_target_interval_seconds=int(
            _read_optional_float("WORLDCUPIQ_LIVE_SCORE_TARGET_INTERVAL_SECONDS", 3)
        ),
        freshness_match_window_minutes=int(
            _read_optional_float("WORLDCUPIQ_FRESHNESS_MATCH_WINDOW_MINUTES", 150)
        ),
        freshness_final_grace_hours=_read_optional_float("WORLDCUPIQ_FRESHNESS_FINAL_GRACE_HOURS", 4),
    )
