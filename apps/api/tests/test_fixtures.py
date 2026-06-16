from fastapi.testclient import TestClient


def test_fixtures_endpoint_returns_mock_schedule(client: TestClient) -> None:
    response = client.get("/fixtures")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) >= 6
    assert payload[0]["stage"] == "group"

