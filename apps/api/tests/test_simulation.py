from fastapi.testclient import TestClient


def test_simulation_endpoint_returns_seeded_placeholder_output(
    client: TestClient,
) -> None:
    response = client.post(
        "/simulate/tournament",
        json={"iterations": 750, "seed": 2026, "startingStage": "group"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["iterations"] == 750
    assert payload["seed"] == 2026
    assert len(payload["winnerProbabilities"]) >= 4
    assert len(payload["projectedGroupTables"]) == 2

