from __future__ import annotations

from dataclasses import asdict, dataclass
from math import exp, factorial, log

from app.schemas.common import GoalProjection, Team
from app.services.formula_registry import ApprovedFormula

MASTER_FORMULA_NAME = "WorldCupIQ master formula"
MASTER_FORMULA_VERSION = "worldcupiq-master-formula-v1"

DEFAULT_FEATURE_WEIGHTS = {
    "strength": 0.52,
    "form": 0.22,
    "squad": 0.16,
    "recent": 0.10,
}
DEFAULT_HOME_ADVANTAGE_LOG = 0.10
DEFAULT_DRAW_BAND = 0.30
DEFAULT_GOAL_SCALE = 1.0
MAX_SCORELINE_GOALS = 8


@dataclass(frozen=True)
class FormulaWeights:
    strength: float
    form: float
    squad: float
    recent: float
    home_advantage_log: float
    draw_band: float
    goal_scale: float


@dataclass(frozen=True)
class TeamFormulaProfile:
    team_id: str
    strength_prior: float
    recent_form: float
    squad_depth: float
    attack_score: float
    defence_score: float
    master_score: float


@dataclass(frozen=True)
class MasterFormulaResult:
    model_name: str
    model_version: str
    formula_source: str
    home_profile: TeamFormulaProfile
    away_profile: TeamFormulaProfile
    expected_goals: GoalProjection
    home_win_probability: float
    draw_probability: float
    away_win_probability: float
    confidence: str
    formula_snapshot: dict[str, object]


def calculate_master_formula(
    home_team: Team,
    away_team: Team,
    approved_formula: ApprovedFormula | None = None,
) -> MasterFormulaResult:
    weights = _weights_from_formula(approved_formula)
    home_profile = _team_profile(home_team, weights)
    away_profile = _team_profile(away_team, weights)
    expected_goals = _expected_goals(home_profile, away_profile, weights)
    home_probability, draw_probability, away_probability = _scoreline_probabilities(
        expected_goals.home,
        expected_goals.away,
        weights,
    )
    confidence = _confidence_from_probabilities(
        home_probability,
        draw_probability,
        away_probability,
        expected_goals,
    )
    model_version = approved_formula.version if approved_formula else MASTER_FORMULA_VERSION
    formula_source = approved_formula.source if approved_formula else "void-blueprint-local"

    snapshot = {
        "formulaName": MASTER_FORMULA_NAME,
        "modelVersion": model_version,
        "formulaSource": formula_source,
        "components": [
            "team_strength_prior",
            "recent_form_modifier",
            "squad_depth_modifier",
            "expected_goals_lambda",
            "poisson_scoreline_matrix",
        ],
        "pendingComponents": [
            "dixon_coles_low_score_correction",
            "brier_log_loss_calibration",
            "source_backed_player_availability",
        ],
        "weights": asdict(weights),
        "homeProfile": asdict(home_profile),
        "awayProfile": asdict(away_profile),
        "expectedGoals": expected_goals.model_dump(mode="json"),
        "probabilities": {
            "homeWin": home_probability,
            "draw": draw_probability,
            "awayWin": away_probability,
        },
    }

    return MasterFormulaResult(
        model_name=MASTER_FORMULA_NAME,
        model_version=model_version,
        formula_source=formula_source,
        home_profile=home_profile,
        away_profile=away_profile,
        expected_goals=expected_goals,
        home_win_probability=home_probability,
        draw_probability=draw_probability,
        away_win_probability=away_probability,
        confidence=confidence,
        formula_snapshot=snapshot,
    )


def _weights_from_formula(formula: ApprovedFormula | None) -> FormulaWeights:
    if formula is None:
        raw_feature_weights = DEFAULT_FEATURE_WEIGHTS
        home_advantage_log = DEFAULT_HOME_ADVANTAGE_LOG
        draw_band = DEFAULT_DRAW_BAND
        goal_scale = DEFAULT_GOAL_SCALE
    else:
        raw_feature_weights = {
            "strength": formula.weights["strength"],
            "form": formula.weights["form"],
            "squad": formula.weights["squad"],
            "recent": formula.weights["recent"],
        }
        home_advantage_log = formula.weights["home_advantage"] / 32
        draw_band = formula.weights["draw_band"]
        goal_scale = formula.weights["goal_scale"]

    feature_total = sum(raw_feature_weights.values()) or 1.0
    return FormulaWeights(
        strength=raw_feature_weights["strength"] / feature_total,
        form=raw_feature_weights["form"] / feature_total,
        squad=raw_feature_weights["squad"] / feature_total,
        recent=raw_feature_weights["recent"] / feature_total,
        home_advantage_log=home_advantage_log,
        draw_band=draw_band,
        goal_scale=goal_scale,
    )


def _team_profile(team: Team, weights: FormulaWeights) -> TeamFormulaProfile:
    strength = _normalise_rating(team.strengthRating)
    form = _normalise_rating(team.formIndex)
    squad = _normalise_rating(team.squadStrength)
    recent = _recent_form_score(team)

    attack_score = (
        strength * weights.strength
        + form * weights.form
        + squad * weights.squad * 0.78
        + recent * weights.recent
    )
    defence_score = (
        strength * weights.strength
        + squad * weights.squad
        + form * weights.form * 0.62
        + recent * weights.recent * 0.82
    )
    master_score = (attack_score * 0.58) + (defence_score * 0.42)

    return TeamFormulaProfile(
        team_id=team.id,
        strength_prior=round(strength, 4),
        recent_form=round(recent, 4),
        squad_depth=round(squad, 4),
        attack_score=round(attack_score, 4),
        defence_score=round(defence_score, 4),
        master_score=round(master_score, 4),
    )


def _expected_goals(
    home_profile: TeamFormulaProfile,
    away_profile: TeamFormulaProfile,
    weights: FormulaWeights,
) -> GoalProjection:
    home_log_lambda = (
        log(1.34)
        + ((home_profile.attack_score - away_profile.defence_score) * 0.72)
        + weights.home_advantage_log
    )
    away_log_lambda = log(1.06) + (
        (away_profile.attack_score - home_profile.defence_score) * 0.72
    )

    home_xg = _clamp(exp(home_log_lambda) * weights.goal_scale, 0.35, 3.25)
    away_xg = _clamp(exp(away_log_lambda) * weights.goal_scale, 0.25, 2.95)
    return GoalProjection(home=round(home_xg, 2), away=round(away_xg, 2))


def _scoreline_probabilities(
    home_xg: float,
    away_xg: float,
    weights: FormulaWeights,
) -> tuple[float, float, float]:
    home_goal_probs = [_poisson_probability(home_xg, goals) for goals in range(MAX_SCORELINE_GOALS + 1)]
    away_goal_probs = [_poisson_probability(away_xg, goals) for goals in range(MAX_SCORELINE_GOALS + 1)]

    home_win = 0.0
    draw = 0.0
    away_win = 0.0
    for home_goals, home_probability in enumerate(home_goal_probs):
        for away_goals, away_probability in enumerate(away_goal_probs):
            score_probability = home_probability * away_probability
            if home_goals > away_goals:
                home_win += score_probability
            elif home_goals == away_goals:
                draw += score_probability
            else:
                away_win += score_probability

    total = home_win + draw + away_win or 1.0
    home_win = home_win / total
    draw = draw / total
    away_win = away_win / total

    draw = _clamp((draw * 0.78) + (weights.draw_band * 0.22), 0.08, 0.42)
    decisive_total = home_win + away_win or 1.0
    decisive_probability = 1 - draw
    home_win = decisive_probability * (home_win / decisive_total)
    away_win = decisive_probability * (away_win / decisive_total)

    home_win = round(home_win, 2)
    draw = round(draw, 2)
    away_win = round(max(0.0, 1 - home_win - draw), 2)
    return home_win, draw, away_win


def _confidence_from_probabilities(
    home_probability: float,
    draw_probability: float,
    away_probability: float,
    expected_goals: GoalProjection,
) -> str:
    ordered = sorted(
        [home_probability, draw_probability, away_probability],
        reverse=True,
    )
    leader_gap = ordered[0] - ordered[1]
    xg_gap = abs(expected_goals.home - expected_goals.away)

    if leader_gap >= 0.16 and xg_gap >= 0.45:
        return "high"
    if leader_gap >= 0.08 or xg_gap >= 0.28:
        return "medium"
    return "low"


def _recent_form_score(team: Team) -> float:
    if not team.lastFiveResults:
        return 0.0

    weights = (1.0, 0.86, 0.72, 0.58, 0.44)
    points = {"W": 1.0, "D": 0.15, "L": -1.0}
    weighted_total = 0.0
    weighted_max = 0.0
    for index, result in enumerate(team.lastFiveResults[:5]):
        weight = weights[index]
        weighted_total += points.get(result, 0.0) * weight
        weighted_max += weight

    return _clamp(weighted_total / weighted_max if weighted_max else 0.0, -1.0, 1.0)


def _normalise_rating(value: float) -> float:
    return _clamp((value - 75.0) / 25.0, -1.5, 1.5)


def _poisson_probability(goal_expectation: float, goals: int) -> float:
    return (exp(-goal_expectation) * (goal_expectation**goals)) / factorial(goals)


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(value, upper))
