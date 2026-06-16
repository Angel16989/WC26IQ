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


@lru_cache
def get_settings() -> Settings:
    _load_runtime_env_files()
    raw_origins = os.getenv("WORLDCUPIQ_CORS_ORIGINS", "http://localhost:3000")
    cors_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    sportsmonks_api_token = os.getenv("SPORTSMONK_API") or os.getenv("SPORTSMONKS_API_TOKEN")

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
    )
