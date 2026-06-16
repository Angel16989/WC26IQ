from fastapi.testclient import TestClient


def test_prediction_endpoint_returns_deterministic_payload(client: TestClient) -> None:
    response = client.post(
        "/predict/match",
        json={
            "homeTeamId": "arg",
            "awayTeamId": "jpn",
            "includeLikelyScorers": True,
            "includeModelNotes": True,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["modelVersion"] == "placeholder-v1"
    assert payload["match"]["homeTeamName"] == "Argentina"
    assert round(
        payload["homeWinProbability"]
        + payload["drawProbability"]
        + payload["awayWinProbability"],
        2,
    ) == 1.0
    assert payload["likelyScorers"]


def test_prediction_endpoint_rejects_unknown_team(client: TestClient) -> None:
    response = client.post(
        "/predict/match",
        json={"homeTeamId": "arg", "awayTeamId": "unknown"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Unknown team id: unknown"

