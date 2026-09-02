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
    assert payload["modelVersion"] == "worldcupiq-master-formula-v1"
    assert payload["match"]["homeTeamName"] == "Argentina"
    assert round(
        payload["homeWinProbability"]
        + payload["drawProbability"]
        + payload["awayWinProbability"],
        2,
    ) == 1.0
    assert payload["likelyScorers"]
    assert payload["notes"]


def test_prediction_endpoint_uses_deepseek_approved_formula(
    client: TestClient,
    monkeypatch,
    tmp_path,
) -> None:
    formula_path = tmp_path / "approved_formula.json"
    formula_path.write_text(
        """
        {
          "formulaType": "worldcupiq-match-probability-v1",
          "version": "deepseek-formula-v1",
          "status": "approved",
          "approvedBy": "deepseek",
          "qualityScore": 0.91,
          "weights": {
            "strength": 0.62,
            "form": 0.28,
            "squad": 0.25,
            "recent": 0.18,
            "home_advantage": 3.4,
            "draw_band": 0.32,
            "goal_scale": 1.02
          },
          "notes": ["DeepSeek approved this candidate after offline validation."]
        }
        """,
        encoding="utf-8",
    )
    monkeypatch.setenv("WORLDCUPIQ_APPROVED_FORMULA_PATH", str(formula_path))

    from app.core.settings import get_settings

    get_settings.cache_clear()

    response = client.post(
        "/predict/match",
        json={
            "homeTeamId": "arg",
            "awayTeamId": "jpn",
            "includeLikelyScorers": False,
            "includeModelNotes": True,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["modelVersion"] == "deepseek-formula-v1"
    assert "Using DeepSeek-approved formula deepseek-formula-v1" in payload["notes"][0]


def test_prediction_endpoint_rejects_low_score_deepseek_formula(
    client: TestClient,
    monkeypatch,
    tmp_path,
) -> None:
    formula_path = tmp_path / "approved_formula.json"
    formula_path.write_text(
        """
        {
          "formulaType": "worldcupiq-match-probability-v1",
          "version": "weak-deepseek-formula",
          "status": "approved",
          "approvedBy": "deepseek",
          "qualityScore": 0.41,
          "weights": {
            "strength": 0.62,
            "form": 0.28,
            "squad": 0.25,
            "recent": 0.18,
            "home_advantage": 3.4,
            "draw_band": 0.32,
            "goal_scale": 1.02
          }
        }
        """,
        encoding="utf-8",
    )
    monkeypatch.setenv("WORLDCUPIQ_APPROVED_FORMULA_PATH", str(formula_path))

    from app.core.settings import get_settings

    get_settings.cache_clear()

    response = client.post(
        "/predict/match",
        json={"homeTeamId": "arg", "awayTeamId": "jpn"},
    )

    assert response.status_code == 200
    assert response.json()["modelVersion"] == "worldcupiq-master-formula-v1"


def test_prediction_endpoint_sends_result_to_storage(
    client: TestClient,
    monkeypatch,
) -> None:
    from app.services import prediction_engine

    stored: list[dict[str, object]] = []

    def fake_persist_prediction(request, response, *, formula_snapshot):
        stored.append(
            {
                "homeTeamId": request.homeTeamId,
                "modelVersion": response.modelVersion,
                "formula": formula_snapshot,
            }
        )

    monkeypatch.setattr(
        prediction_engine,
        "persist_prediction",
        fake_persist_prediction,
    )

    response = client.post(
        "/predict/match",
        json={"homeTeamId": "arg", "awayTeamId": "jpn"},
    )

    assert response.status_code == 200
    assert stored
    assert stored[0]["homeTeamId"] == "arg"
    assert stored[0]["modelVersion"] == "worldcupiq-master-formula-v1"
    assert stored[0]["formula"]["formulaName"] == "WorldCupIQ master formula"


def test_prediction_endpoint_rejects_unknown_team(client: TestClient) -> None:
    response = client.post(
        "/predict/match",
        json={"homeTeamId": "arg", "awayTeamId": "unknown"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Unknown team id: unknown"
