from math import exp

from app.data.postgres_store import persist_prediction
from app.data.repository import get_players_by_team, get_team_by_id
from app.schemas.common import GoalProjection, Player
from app.schemas.prediction import (
    LikelyScorerPrediction,
    MatchPredictionRequest,
    MatchPredictionResponse,
    MatchReference,
)
from app.services.formula_registry import load_approved_formula
from app.services.master_formula import (
    MASTER_FORMULA_VERSION,
    MasterFormulaResult,
    calculate_master_formula,
)

MODEL_VERSION = MASTER_FORMULA_VERSION


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(value, upper))


def _top_scorers(players: list[Player], limit: int = 2) -> list[Player]:
    starters = [player for player in players if player.likelyStarter]
    ordered = sorted(
        starters,
        key=lambda player: (player.goalThreat, player.clubFormIndex),
        reverse=True,
    )
    return ordered[:limit]


def _build_likely_scorers(
    home_team_id: str,
    away_team_id: str,
    expected_goals: GoalProjection,
) -> list[LikelyScorerPrediction]:
    home_candidates = _top_scorers(get_players_by_team(home_team_id), 2)
    away_candidates = _top_scorers(get_players_by_team(away_team_id), 2)
    candidates = [
        *[(player, expected_goals.home) for player in home_candidates],
        *[(player, expected_goals.away) for player in away_candidates],
    ]

    scorer_predictions: list[LikelyScorerPrediction] = []
    seen: set[str] = set()
    team_weight_totals = {
        home_team_id: _team_goal_weight(home_candidates),
        away_team_id: _team_goal_weight(away_candidates),
    }
    for player, team_xg in candidates:
        if player.id in seen:
            continue
        seen.add(player.id)

        team_weight = max(team_weight_totals.get(player.teamId, 0.0), 0.1)
        player_share = _player_goal_weight(player) / team_weight
        probability = _clamp(
            1 - exp(-(team_xg * player_share * 1.12)),
            0.05,
            0.74,
        )
        scorer_predictions.append(
            LikelyScorerPrediction(
                playerId=player.id,
                name=player.name,
                teamId=player.teamId,
                probability=round(probability, 2),
            )
        )

    return scorer_predictions


def _team_goal_weight(players: list[Player]) -> float:
    return sum(_player_goal_weight(player) for player in players)


def _player_goal_weight(player: Player) -> float:
    starter_bonus = 0.12 if player.likelyStarter else 0.0
    return (player.goalThreat * 0.68) + (player.clubFormIndex / 260) + starter_bonus


def _build_explanation(
    home_team_name: str,
    away_team_name: str,
    formula_result: MasterFormulaResult,
) -> str:
    if formula_result.draw_probability >= max(
        formula_result.home_win_probability,
        formula_result.away_win_probability,
    ):
        return (
            "The master formula sees a tight matchup because the team-strength "
            "prior, recent form modifier, and expected-goals split are closely "
            "clustered."
        )

    leader = (
        home_team_name
        if formula_result.home_win_probability >= formula_result.away_win_probability
        else away_team_name
    )
    return (
        f"{leader} grades higher in the master formula after team strength, "
        "recent form, squad depth, and expected goals are converted through a "
        "Poisson scoreline matrix."
    )


def predict_match(request: MatchPredictionRequest) -> MatchPredictionResponse:
    home_team = get_team_by_id(request.homeTeamId)
    away_team = get_team_by_id(request.awayTeamId)

    if home_team is None or away_team is None:
        missing = request.homeTeamId if home_team is None else request.awayTeamId
        raise ValueError(f"Unknown team id: {missing}")

    approved_formula = load_approved_formula()
    formula_result = calculate_master_formula(
        home_team,
        away_team,
        approved_formula=approved_formula,
    )

    likely_scorers = (
        _build_likely_scorers(home_team.id, away_team.id, formula_result.expected_goals)
        if request.includeLikelyScorers
        else []
    )
    explanation = _build_explanation(
        home_team.name,
        away_team.name,
        formula_result,
    )

    notes: list[str] = []
    if request.includeModelNotes:
        notes = [
            "Master formula: team-strength prior plus recent form and squad depth.",
            "Expected goals are transformed through a Poisson scoreline matrix.",
            "Dixon-Coles correction and calibration stay pending until source-backed match history is clean.",
        ]
        if approved_formula is not None:
            notes.insert(
                0,
                f"Using DeepSeek-approved formula {approved_formula.version} with quality score {approved_formula.quality_score:.2f}.",
            )
            notes.extend(approved_formula.notes)

    response = MatchPredictionResponse(
        match=MatchReference(
            homeTeamId=home_team.id,
            awayTeamId=away_team.id,
            homeTeamName=home_team.name,
            awayTeamName=away_team.name,
        ),
        homeWinProbability=formula_result.home_win_probability,
        drawProbability=formula_result.draw_probability,
        awayWinProbability=formula_result.away_win_probability,
        expectedGoals=formula_result.expected_goals,
        likelyScorers=likely_scorers,
        confidence=formula_result.confidence,
        modelVersion=formula_result.model_version,
        explanation=explanation,
        notes=notes,
    )
    persist_prediction(
        request,
        response,
        formula_snapshot=formula_result.formula_snapshot,
    )
    return response
