from collections import defaultdict
from random import Random

from app.data.repository import get_teams
from app.schemas.common import GroupTable, GroupTableRow, Team, TeamProbability
from app.schemas.simulation import (
    TournamentSimulationRequest,
    TournamentSimulationResponse,
)


def _team_rating(team: Team) -> float:
    return (
        team.strengthRating * 0.55
        + team.formIndex * 0.25
        + team.squadStrength * 0.20
    )


def _normalise_probabilities(teams: list[tuple[Team, float]]) -> list[TeamProbability]:
    total = sum(score for _, score in teams)
    probabilities = []
    for team, score in teams:
        probability = round(score / total, 3) if total else 0.0
        probabilities.append(
            TeamProbability(teamId=team.id, teamName=team.name, probability=probability)
        )

    return sorted(probabilities, key=lambda item: item.probability, reverse=True)


def _build_group_tables(
    rated_teams: list[tuple[Team, float]], rng: Random, include_groups: bool
) -> list[GroupTable]:
    if not include_groups:
        return []

    grouped: dict[str, list[tuple[Team, float]]] = defaultdict(list)
    for team, score in rated_teams:
        grouped[team.group or "Unassigned"].append((team, score))

    tables: list[GroupTable] = []
    for group_name, teams in sorted(grouped.items()):
        ordered = sorted(teams, key=lambda item: item[1], reverse=True)
        standings: list[GroupTableRow] = []

        for index, (team, score) in enumerate(ordered):
            base_points = max(1, 7 - index * 2)
            points = base_points + rng.randint(0, 1)
            goals_for = max(1, int(round(score / 18)) + (1 - index))
            goals_against = max(0, goals_for - rng.randint(0, 2) - (1 if index < 2 else 0))
            standings.append(
                GroupTableRow(
                    teamId=team.id,
                    teamName=team.name,
                    points=points,
                    played=3,
                    wins=min(3, max(0, points // 3)),
                    draws=1 if points % 3 else 0,
                    losses=max(0, 3 - (min(3, max(0, points // 3)) + (1 if points % 3 else 0))),
                    goalsFor=goals_for,
                    goalsAgainst=goals_against,
                    goalDifference=goals_for - goals_against,
                    qualificationStatus=(
                        "projected_advance" if index < 2 else "projected_eliminate"
                    ),
                )
            )

        tables.append(GroupTable(group=group_name, standings=standings))

    return tables


def simulate_tournament(
    request: TournamentSimulationRequest,
) -> TournamentSimulationResponse:
    rng = Random(request.seed)
    scored_teams: list[tuple[Team, float]] = []

    for team in get_teams():
        noise = rng.uniform(-2.5, 2.5)
        scored_teams.append((team, _team_rating(team) + noise))

    ordered_scores = sorted(scored_teams, key=lambda item: item[1], reverse=True)
    shifted_scores = [(team, max(score + 5.0, 1.0)) for team, score in ordered_scores]
    winner_probabilities = _normalise_probabilities(shifted_scores)

    finalists = [
        TeamProbability(
            teamId=item.teamId,
            teamName=item.teamName,
            probability=round(min(item.probability * 1.85, 0.62), 3),
        )
        for item in winner_probabilities[:2]
    ]
    semi_finalists = [
        TeamProbability(
            teamId=item.teamId,
            teamName=item.teamName,
            probability=round(min(item.probability * 2.35, 0.84), 3),
        )
        for item in winner_probabilities[:4]
    ]

    projected_group_tables = _build_group_tables(
        ordered_scores,
        rng,
        include_groups=request.startingStage == "group",
    )

    notes = [
        "Simulation output is placeholder-only and uses seeded deterministic noise on top of mock team ratings.",
        "Future work can replace this with calibrated Monte Carlo tournament simulation tied to real fixtures and result distributions.",
    ]

    return TournamentSimulationResponse(
        iterations=request.iterations,
        seed=request.seed,
        startingStage=request.startingStage,
        winnerProbabilities=winner_probabilities,
        finalists=finalists,
        semiFinalists=semi_finalists,
        projectedGroupTables=projected_group_tables,
        notes=notes,
    )

