import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))


@pytest.fixture(autouse=True)
def _force_mock_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("WORLDCUPIQ_SKIP_ENV_FILES", "1")
    monkeypatch.setenv("WORLDCUPIQ_DATA_PROVIDER", "mock")
    monkeypatch.delenv("WORLDCUPIQ_DATABASE_URL", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("WORLDCUPIQ_WAREHOUSE_URL", raising=False)
    # Prevent tests from hitting the live warehouse (setenv "" so _load_env_file
    # won't override it when settings re-reads the .env file on cache_clear)
    monkeypatch.setenv("WORLDCUPIQ_WAREHOUSE_URL", "")

    from app.core.settings import get_settings
    from app.data.repository import get_data_bundle, get_fixtures, get_players, get_teams

    get_settings.cache_clear()
    get_data_bundle.cache_clear()
    get_teams.cache_clear()
    get_players.cache_clear()
    get_fixtures.cache_clear()


@pytest.fixture
def client() -> TestClient:
    from app.main import app

    return TestClient(app)
