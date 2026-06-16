from app.data.repository import get_players_by_team, get_team_by_id
from app.schemas.common import GoalProjection, Player, Team
from app.schemas.prediction import (
    LikelyScorerPrediction,
    MatchPredictionRequest,
    MatchPredictionResponse,
    MatchReference,
)

MODEL_VERSION = "placeholder-v1"


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(value, upper))


def _team_score(team: Team, home_advantage: float = 0.0) -> float:
    return (
        team.strengthRating * 0.55
        + team.formIndex * 0.25
        + team.squadStrength * 0.20
        + home_advantage
    )


def _top_scorers(players: list[Player], limit: int = 2) -> list[Player]:
    starters = [player for player in players if player.likelyStarter]
    ordered = sorted(
        starters,
        key=lambda player: (player.goalThreat, player.clubFormIndex),
        reverse=True,
    )
    return ordered[:limit]


def _build_likely_scorers(home_team_id: str, away_team_id: str) -> list[LikelyScorerPrediction]:
    candidates = _top_scorers(get_players_by_team(home_team_id), 2) + _top_scorers(
        get_players_by_team(away_team_id), 1
    )

    scorer_predictions: list[LikelyScorerPrediction] = []
    for player in candidates:
        probability = _clamp((player.goalThreat * 0.55) + (player.clubFormIndex / 250), 0.12, 0.68)
        scorer_predictions.append(
            LikelyScorerPrediction(
                playerId=player.id,
                name=player.name,
                teamId=player.teamId,
                probability=round(probability, 2),
            )
        )

    return scorer_predictions


def _expected_goals(home_score: float, away_score: float) -> GoalProjection:
    score_gap = home_score - away_score
    home_xg = _clamp(0.95 + (home_score / 100) + max(score_gap, 0) / 32, 0.6, 2.6)
    away_xg = _clamp(0.72 + (away_score / 110) - max(score_gap, 0) / 55, 0.45, 2.2)
    return GoalProjection(home=round(home_xg, 2), away=round(away_xg, 2))


def _confidence_from_gap(score_gap: float) -> str:
    if abs(score_gap) >= 9:
        return "high"
    if abs(score_gap) >= 4:
        return "medium"
    return "low"


def predict_match(request: MatchPredictionRequest) -> MatchPredictionResponse:
    home_team = get_team_by_id(request.homeTeamId)
    away_team = get_team_by_id(request.awayTeamId)

    if home_team is None or away_team is None:
        missing = request.homeTeamId if home_team is None else request.awayTeamId
        raise ValueError(f"Unknown team id: {missing}")

    home_score = _team_score(home_team, home_advantage=2.5)
    away_score = _team_score(away_team)
    draw_score = max(18.0, 28.0 - abs(home_score - away_score) * 0.7)
    total_score = home_score + away_score + draw_score

    home_probability = round(home_score / total_score, 2)
    away_probability = round(away_score / total_score, 2)
    draw_probability = round(max(0.0, 1 - home_probability - away_probability), 2)
    probability_delta = round(1 - (home_probability + away_probability + draw_probability), 2)
    home_probability = round(home_probability + probability_delta, 2)

    score_gap = round(home_score - away_score, 2)
    expected_goals = _expected_goals(home_score, away_score)
    likely_scorers = (
        _build_likely_scorers(home_team.id, away_team.id)
        if request.includeLikelyScorers
        else []
    )
    confidence = _confidence_from_gap(score_gap)

    explanation = (
        f"{home_team.name} grades higher on the placeholder blend of team strength, "
        f"recent form, and squad depth. This is a deterministic scaffold response, "
        f"not a production forecasting model."
        if score_gap >= 0
        else (
            f"{away_team.name} edges the placeholder profile on team strength, recent "
            f"form, and squad depth. This is a deterministic scaffold response, not a "
            f"production forecasting model."
        )
    )

    notes: list[str] = []
    if request.includeModelNotes:
        notes = [
            "Placeholder deterministic model using mock team strength, form, and squad depth.",
            "Future upgrades can slot in Elo, Poisson, Dixon-Coles, xG, Monte Carlo, and player-level scorer models here.",
        ]

    return MatchPredictionResponse(
        match=MatchReference(
            homeTeamId=home_team.id,
            awayTeamId=away_team.id,
            homeTeamName=home_team.name,
            awayTeamName=away_team.name,
        ),
        homeWinProbability=home_probability,
        drawProbability=draw_probability,
        awayWinProbability=away_probability,
        expectedGoals=expected_goals,
        likelyScorers=likely_scorers,
        confidence=confidence,
        modelVersion=MODEL_VERSION,
        explanation=explanation,
        notes=notes,
    )

