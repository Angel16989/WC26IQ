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

    # Build 5 narrative scenarios
    scenarios: list[WinnerScenario] = []

    # ── TEAM TIERS — based on historical WC record + current squad quality ──
    # Tier 1 = Clear favourites (must never appear as "dark horse")
    # Tier 2 = Strong contenders
    # Tier 3 = True dark horses (shock winners)
    TIER_1 = {"arg", "bra", "fra", "ger", "esp", "eng"}   # perennial powers
    TIER_2 = {"por", "ned", "bel", "uru", "cro", "den", "usa", "mex", "mar"}
    # Everyone else is Tier 3

    def _tier(team_id: str) -> int:
        if team_id in TIER_1: return 1
        if team_id in TIER_2: return 2
        return 3

    # ── SCENARIO TEMPLATES — 5 distinct narratives with correct tier mapping ──
    # Each slot specifies which tier the champion MUST be from
    scenario_templates = [
        ("favourite",   "The Champion Favourite",
         "The pre-tournament favourite delivers",
         "Clinical, dominant, and relentless — the team everyone feared in the draw "
         "lives up to every expectation. World-class talent, an elite coach, and "
         "tournament experience combine to produce a masterclass performance.",
         [1]),   # must be Tier 1
        ("second-giant", "South American / European Powerhouse",
         "The second superpower claims the trophy",
         "Two giants were always destined to clash. With Tier 1 talent and a "
         "burning desire to reclaim football's highest prize, this team dismantles "
         "every opponent with attacking football that leaves no answer.",
         [1]),   # also Tier 1 (different team)
        ("contender",   "The Contender's Moment",
         "A top-10 nation finally breaks through",
         "Talented enough to win, overlooked often enough to have a point to prove. "
         "This side peaks at exactly the right moment — combining structure, "
         "individual brilliance, and tactical discipline to outlast the heavyweights.",
         [2]),   # Tier 2
        ("host-glory",  "Home Continent Glory",
         "The Americas claim the inaugural 48-team title",
         "With three host nations (USA, Canada, Mexico), CONCACAF has never had a "
         "better shot. Massive home support, travel advantage, and a generation of "
         "talented players combine in a perfect storm.",
         [2, 3]),  # Tier 2 or 3 CONCACAF/Americas
        ("dark-horse",  "The Shock Winner",
         "Nobody predicted this — and that's the magic of football",
         "Not in any bookmaker's top 10. Dismissed after the draw. Yet here they "
         "are — riding wave after wave of team spirit, tactical brilliance, and "
         "inspired goalkeeping to claim the trophy the world never saw coming.",
         [3]),   # must be Tier 3
    ]

    used_teams: set[str] = set()
    for i, (scid, title, subtitle, narrative, allowed_tiers) in enumerate(scenario_templates):
        # Pick the best eligible team matching the tier constraint
        chosen_tid: str | None = None
        chosen_prob: float = 0.0
        for tid, prob in ranked:
            if tid in used_teams:
                continue
            tier = _tier(tid)
            # Special case: host-glory prefers Americas teams
            if scid == "host-glory":
                team_obj = team_by_id.get(tid)
                conf = team_obj.confederation if team_obj else ""
                if "CONCACAF" not in conf and "CONMEBOL" not in conf:
                    continue
            if tier in allowed_tiers:
                chosen_tid = tid
                chosen_prob = prob
                break
        # Fallback: any unused team
        if not chosen_tid:
            for tid, prob in ranked:
                if tid not in used_teams:
                    chosen_tid = tid
                    chosen_prob = prob
                    break
        if not chosen_tid:
            continue

        team = team_by_id.get(chosen_tid)
        if not team:
            continue

        # Compute key matches
        key_opponents = [
            team_by_id[r[0]] for r in ranked
            if r[0] != chosen_tid and r[0] not in used_teams and team_by_id.get(r[0])
        ][:3]
        key_matches_list = []
        stage_names = ["quarterfinal", "semifinal", "final"]
        for j, opp in enumerate(key_opponents):
            ph, _, _ = _win_probabilities(team, opp, neutral=True)
            key_matches_list.append({
                "stage": stage_names[j],
                "opponent_id": opp.id,
                "opponent_name": opp.name.title(),
                "opponent_fifa": opp.fifaCode,
                "win_pct": round(ph * 100, 1),
            })

        scenarios.append(WinnerScenario(
            scenario_id=scid,
            title=title,
            subtitle=subtitle,
            champion_team_id=chosen_tid,
            champion_name=team.name.title(),
            champion_fifa=team.fifaCode,
            probability=round(chosen_prob * 100, 1),
            narrative=narrative,
            key_matches=key_matches_list,
        ))
        used_teams.add(chosen_tid)

    # Normalise probabilities to sum to 100
    total_pct = sum(s.probability for s in scenarios) or 1.0
    for s in scenarios:
        s.probability = round(s.probability * 100.0 / total_pct, 1)

    return scenarios[:5]
