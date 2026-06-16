import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))


@pytest.fixture(autouse=True)
def _force_mock_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("WORLDCUPIQ_DATA_PROVIDER", "mock")

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
