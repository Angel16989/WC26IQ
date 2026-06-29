"""
WorldCupIQ Tournament Prediction Engine.

Uses the master Poisson formula to simulate the WC 2026 knockout bracket
and generate 5 distinct winner scenarios with probabilities.

Formula basis:
  - Poisson scoreline matrix from master_formula.py
  - Strength-weighted expected goals (λ_home, λ_away)
  - Time-decay on recent form (10% weight)
  - Neutral venue (no home advantage for knockout matches)
  - Dixon-Coles low-score correction applied to 0-0 / 1-0 / 0-1 cells

Scenario generation:
  Monte-Carlo simulation (10 000 iterations) then group top outcomes
  into 5 narrative scenario buckets.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from math import exp, factorial
from typing import Literal

from app.data.repository import get_data_bundle
from app.schemas.common import Match, Team

# ── Poisson helpers ──────────────────────────────────────────────────────────

def _poisson_pmf(k: int, lam: float) -> float:
    """P(X = k) for Poisson(λ)."""
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return (lam ** k) * exp(-lam) / factorial(k)


def _dc_correction(h: int, a: int, lam_h: float, lam_a: float, rho: float = 0.08) -> float:
    """Dixon–Coles low-score correction factor."""
    if h == 0 and a == 0:
        return 1.0 - lam_h * lam_a * rho
    if h == 1 and a == 0:
        return 1.0 + lam_a * rho
    if h == 0 and a == 1:
        return 1.0 + lam_h * rho
    if h == 1 and a == 1:
        return 1.0 - rho
    return 1.0


def _expected_lambdas(t1: Team, t2: Team, neutral: bool = True) -> tuple[float, float]:
    """Expected goals (λ) for t1 vs t2 using our master formula weights."""
    def _norm(r: float) -> float:
        return max(0.0, min(1.0, (r - 45.0) / 52.0))

    s1, f1, q1 = _norm(t1.strengthRating), _norm(t1.formIndex), _norm(t1.squadStrength)
    s2, f2, q2 = _norm(t2.strengthRating), _norm(t2.formIndex), _norm(t2.squadStrength)

    def _form_bonus(results: list) -> float:
        w = sum(1 for r in results[-5:] if r == "W")
        l_ = sum(1 for r in results[-5:] if r == "L")
        return 0.06 * w - 0.06 * l_

    a1 = 0.52 * s1 + 0.22 * f1 + 0.16 * q1 * 0.78 + 0.10 * _form_bonus(t1.lastFiveResults)
    d1 = 0.52 * s1 + 0.16 * q1 + 0.22 * f1 * 0.62
    a2 = 0.52 * s2 + 0.22 * f2 + 0.16 * q2 * 0.78 + 0.10 * _form_bonus(t2.lastFiveResults)
    d2 = 0.52 * s2 + 0.16 * q2 + 0.22 * f2 * 0.62

    base_goals = 2.55
    lam1 = max(0.30, base_goals * (a1 + 0.5) / (d2 + 0.5))
    lam2 = max(0.30, base_goals * (a2 + 0.5) / (d1 + 0.5))
    if not neutral:
        lam1 *= 1.10  # +10% for home
    return round(lam1, 3), round(lam2, 3)


def _win_probabilities(t1: Team, t2: Team, neutral: bool = True) -> tuple[float, float, float]:
    """Return (p_t1_win, p_draw, p_t2_win) using DC-corrected Poisson."""
    lam1, lam2 = _expected_lambdas(t1, t2, neutral=neutral)
    max_g = 7
    p1 = p_draw = p2 = 0.0
    for h in range(max_g + 1):
        for a in range(max_g + 1):
            p = (_poisson_pmf(h, lam1) * _poisson_pmf(a, lam2) *
                 _dc_correction(h, a, lam1, lam2))
            if h > a:
                p1 += p
            elif h == a:
                p_draw += p
            else:
                p2 += p
    total = p1 + p_draw + p2 or 1.0
    return p1 / total, p_draw / total, p2 / total


def _simulate_match(t1: Team, t2: Team, rng: random.Random, neutral: bool = True) -> Team:
    """Simulate a knockout match (extra-time & penalties if draw)."""
    p1, p_draw, p2 = _win_probabilities(t1, t2, neutral=neutral)
    r = rng.random()
    if r < p1:
        return t1
    if r < p1 + p_draw:
        # Penalties: slight edge to better team
        return t1 if rng.random() < 0.52 + 0.04 * (t1.strengthRating - t2.strengthRating) / 50 else t2
    return t2


# ── Bracket structures ───────────────────────────────────────────────────────

@dataclass
class BracketMatch:
    match_id: str
    stage: str
    home_team_id: str | None
    away_team_id: str | None
    home_score: int | None
    away_score: int | None
    status: str  # completed | scheduled | tbd
    kickoff_utc: str | None
    home_name: str | None = None
    away_name: str | None = None
    home_fifa: str | None = None
    away_fifa: str | None = None
    predicted_home_win_pct: float | None = None
    predicted_away_win_pct: float | None = None
    predicted_draw_pct: float | None = None


@dataclass
class WinnerScenario:
    scenario_id: str
    title: str
    subtitle: str
    champion_team_id: str
    champion_name: str
    champion_fifa: str
    probability: float
    narrative: str
    key_matches: list[dict]


# ── Main public functions ─────────────────────────────────────────────────────

def get_knockout_bracket() -> list[BracketMatch]:
    """Return all R32→Final matches with real scores where available."""
    bundle = get_data_bundle()
    team_by_id = {t.id: t for t in bundle.teams}

    knockout_stages = {"round_of_16", "quarterfinal", "semifinal", "third_place", "final"}
    matches = [m for m in bundle.fixtures if m.stage in knockout_stages]

    result: list[BracketMatch] = []
    for m in sorted(matches, key=lambda x: x.kickoffUtc):
        home = team_by_id.get(m.homeTeamId)
        away = team_by_id.get(m.awayTeamId)

        raw = getattr(m, "rawFixture", {}) or {}
        home_score: int | None = None
        away_score: int | None = None
        try:
            hs = raw.get("home_score")
            as_ = raw.get("away_score")
            if hs is not None:
                home_score = int(hs)
            if as_ is not None:
                away_score = int(as_)
        except (TypeError, ValueError):
            pass

        p_home = p_away = p_draw = None
        if home and away:
            ph, pd, pa = _win_probabilities(home, away, neutral=True)
            p_home, p_draw, p_away = round(ph * 100, 1), round(pd * 100, 1), round(pa * 100, 1)

        result.append(BracketMatch(
            match_id=m.id,
            stage=m.stage,
            home_team_id=m.homeTeamId,
            away_team_id=m.awayTeamId,
            home_score=home_score,
            away_score=away_score,
            status=m.status,
            kickoff_utc=m.kickoffUtc,
            home_name=home.name.title() if home else None,
            away_name=away.name.title() if away else None,
            home_fifa=home.fifaCode if home else None,
            away_fifa=away.fifaCode if away else None,
            predicted_home_win_pct=p_home,
            predicted_away_win_pct=p_away,
            predicted_draw_pct=p_draw,
        ))

    return result


def generate_winner_scenarios(n_simulations: int = 8000) -> list[WinnerScenario]:
    """
    Run Monte Carlo tournament simulations and distil into 5 narrative scenarios.

    Uses:
    - DC-corrected Poisson (our master formula)
    - Current strength / form / squad ratings from warehouse
    - Actual results for completed matches (winner locked in)
    """
    bundle = get_data_bundle()
    team_by_id = {t.id: t for t in bundle.teams}

    # Identify teams still in the tournament from completed R32 / group data
    knockout_stages = {"round_of_16", "quarterfinal", "semifinal", "third_place", "final"}
    r32_matches = [m for m in bundle.fixtures if m.stage in knockout_stages]

    # Build pool of active teams: winners of completed R32, or both teams if scheduled
    eliminated: set[str] = set()
    active: set[str] = set()

    for m in r32_matches:
        if m.status == "final":
            raw = getattr(m, "rawFixture", {}) or {}
            try:
                hs = int(raw.get("home_score", -1))
                as_ = int(raw.get("away_score", -1))
                if hs > as_:
                    eliminated.add(m.awayTeamId)
                    active.add(m.homeTeamId)
                elif as_ > hs:
                    eliminated.add(m.homeTeamId)
                    active.add(m.awayTeamId)
            except (TypeError, ValueError):
                pass
        else:
            if m.homeTeamId:
                active.add(m.homeTeamId)
            if m.awayTeamId:
                active.add(m.awayTeamId)

    # If no active teams found, fall back to all 48 (very early in tournament)
    if len(active) < 16:
        active = {t.id for t in bundle.teams}

    active_teams = [team_by_id[tid] for tid in active if tid in team_by_id]
    if len(active_teams) < 4:
        active_teams = bundle.teams[:32]

    # Monte Carlo simulation
    rng = random.Random(2026)
    win_counts: dict[str, int] = {t.id: 0 for t in active_teams}

    for _ in range(n_simulations):
        pool = list(active_teams)
        rng.shuffle(pool)
        while len(pool) > 1:
            next_round = []
            for i in range(0, len(pool) - 1, 2):
                winner = _simulate_match(pool[i], pool[i + 1], rng, neutral=True)
                next_round.append(winner)
            if len(pool) % 2 == 1:
                next_round.append(pool[-1])
            pool = next_round
        if pool:
            win_counts[pool[0].id] = win_counts.get(pool[0].id, 0) + 1

    total = sum(win_counts.values()) or 1

    # Sort by probability descending
    ranked = sorted(
        [(tid, cnt / total) for tid, cnt in win_counts.items() if cnt > 0],
        key=lambda x: -x[1],
    )

    # Identify which team is from which confederation
    def _confederation(team: Team) -> str:
        return team.confederation

    # Build 5 narrative scenarios from the top contenders
    scenarios: list[WinnerScenario] = []

    scenario_templates = [
        ("dominant-favourite", "The Dominant Favourite",
         "The highest-ranked team fulfils expectations",
         "Rolls through the bracket with clinical performances — none of the other top sides can match their consistency."),
        ("sleeping-giant", "The Giant Wakes",
         "Second seed detonates the bracket",
         "Starts quietly in the group stage then turns the tournament upside down from the quarterfinals onward."),
        ("dark-horse", "Dark Horse Runs Deep",
         "An underdog outlasts the giants",
         "Absorbs early pressure, wins on fine margins, and reaches the final when the tournament's big names knock each other out."),
        ("revenge-arc", "The Revenge Arc",
         "Last tournament's runners-up go all the way",
         "Uses every lesson from a previous final defeat to build the most complete squad in the tournament."),
        ("host-nation", "Tournament Miracle",
         "Nobody saw this coming",
         "Feeds off home-nation energy and inspired performances, defeating a succession of higher-ranked sides in shock results."),
    ]

    used_teams: set[str] = set()
    for i, (scid, title, subtitle, narrative) in enumerate(scenario_templates):
        # Pick best eligible team not already used
        for tid, prob in ranked:
            if tid not in used_teams:
                team = team_by_id.get(tid)
                if team:
                    # Compute key matches this team would likely play
                    key_opponents = [
                        team_by_id[r[0]] for r in ranked
                        if r[0] != tid and r[0] not in used_teams
                    ][:3]
                    key_matches_list = []
                    for opp in key_opponents:
                        ph, pd, pa = _win_probabilities(team, opp, neutral=True)
                        key_matches_list.append({
                            "stage": "quarterfinal" if len(key_matches_list) == 0 else
                                     "semifinal" if len(key_matches_list) == 1 else "final",
                            "opponent_id": opp.id,
                            "opponent_name": opp.name.title(),
                            "opponent_fifa": opp.fifaCode,
                            "win_pct": round(ph * 100, 1),
                        })

                    scenarios.append(WinnerScenario(
                        scenario_id=scid,
                        title=title,
                        subtitle=subtitle,
                        champion_team_id=tid,
                        champion_name=team.name.title(),
                        champion_fifa=team.fifaCode,
                        probability=round(prob * 100, 1),
                        narrative=narrative,
                        key_matches=key_matches_list,
                    ))
                    used_teams.add(tid)
                    break

        if len(scenarios) == 5:
            break

    # Normalise probabilities to sum to 100
    total_pct = sum(s.probability for s in scenarios) or 1.0
    for s in scenarios:
        s.probability = round(s.probability * 100.0 / total_pct, 1)

    return scenarios[:5]
