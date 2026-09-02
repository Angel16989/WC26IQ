from fastapi.testclient import TestClient


def test_teams_endpoint_returns_mock_teams(client: TestClient) -> None:
    response = client.get("/teams")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) >= 8
    assert payload[0]["fifaCode"] == "ARG"

