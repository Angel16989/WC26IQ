# WorldCupIQ Formula Catalog

This file is the starting formula catalog for WorldCupIQ. It is intentionally
written as a practical build sheet rather than a paper dump so the overnight
research worker can expand it with evidence, calibration notes, and source
quality checks.

## Main Goal

Pick formulas that are:

- explainable enough for product copy
- strong enough for national-team football prediction
- calibratable with imperfect international-match data
- safe to combine into ensembles

## Core Formula Families

### 1. Elo-style rating updates

Use when:

- we need a baseline strength rating per national team
- we want a fast-moving prior before richer match features exist

Core idea:

- update each team rating after every match
- scale the update by match importance, venue, and goal margin
- use rating difference as a pre-match strength prior

Best use in WorldCupIQ:

- baseline team strength
- prior for match-win probabilities
- feature inside richer models

### 2. Independent Poisson goal model

Use when:

- we want scoreline probabilities quickly
- we have attack/defense strength estimates per team

Core idea:

- estimate expected home goals and away goals
- treat each side's goals as Poisson-distributed
- derive scoreline and result probabilities from the joint table

Best use in WorldCupIQ:

- exact-score probabilities
- over/under style internal analytics
- expected-goals-to-scoreline conversion

### 3. Dixon-Coles adjustment

Use when:

- we want Poisson-style score modeling but better handling of low-score matches

Core idea:

- start from the independent Poisson model
- add a correction term for low-score outcomes such as 0-0, 1-0, 0-1, and 1-1
- optionally add time-decay weighting for newer matches

Best use in WorldCupIQ:

- stronger football-specific score probabilities
- tournament matches where low-scoring outcomes matter a lot

### 4. Bivariate Poisson

Use when:

- we want correlation between the two teams' goal totals

Core idea:

- model each side's goals with shared latent scoring intensity
- capture score dependence better than fully independent Poisson

Best use in WorldCupIQ:

- exact score grids
- match simulations where goal dependence matters

### 5. Bradley-Terry or logistic win model

Use when:

- we want cleaner win/draw/loss probabilities from feature vectors

Core idea:

- convert team-level features into outcome probabilities with logistic structure
- use strength, form, rest, venue, injuries, and travel as inputs

Best use in WorldCupIQ:

- simpler interpretable prediction layer
- ensemble ingredient beside goal models

### 6. xG-informed hybrid model

Use when:

- we have reliable expected-goals or shot-quality data

Core idea:

- use recent xG for and xG against as stronger indicators than raw scorelines alone
- blend them with Elo or rating priors

Best use in WorldCupIQ:

- higher-fidelity short-horizon forecasts
- form estimation for last-10-match windows

### 7. Monte Carlo tournament simulation

Use when:

- we want projected group tables, knockout paths, and title probabilities

Core idea:

- run repeated simulations from match-level probabilities
- propagate uncertainty through group standings and knockouts

Best use in WorldCupIQ:

- winner probabilities
- stage reach probabilities
- scenario analysis

### 8. Ensemble and calibration layer

Use when:

- multiple models each contribute signal but none is strong enough alone

Core idea:

- combine calibrated outputs from Elo, score models, and form models
- tune weights on held-out historical tournaments and qualifiers

Best use in WorldCupIQ:

- final user-facing probabilities
- confidence scoring
- robustness against one model family failing

## Master Formula Direction

The strongest WorldCupIQ path is a calibrated ensemble, not a single model that
pretends to know everything. Treat each model as a specialist and blend them
only after validation.

Phase-one match model:

```text
P_final(outcome) =
  Calibrate(
    w_elo * P_elo(outcome)
  + w_poisson * P_poisson_or_dixon_coles(outcome)
  + w_form * P_recent_form(outcome)
  + w_squad * P_player_availability(outcome)
  + w_context * P_context_adjustment(outcome)
  )
```

Phase-one expected goals:

```text
lambda_team =
  exp(
    base
  + attack_strength(team)
  - defense_strength(opponent)
  + venue_adjustment
  + recent_form_adjustment
  + squad_availability_adjustment
  + rest_travel_adjustment
  )
```

Then:

- convert expected goals into scoreline probabilities with Poisson or Dixon-Coles
- convert scoreline probabilities into win/draw/loss probabilities
- run Monte Carlo tournament simulations from calibrated match probabilities
- score confidence from model agreement, data freshness, and source quality

## Source Ensemble Direction

Research should compare multiple retrieval paths instead of trusting one search
engine. VOID should keep OpenClaw as the primary search layer, then compare it
against LangChain-backed retrieval and fallback search results.

Source confidence formula:

```text
source_confidence =
  official_source_bonus
+ cross_source_agreement
+ freshness_score
+ field_completeness
- conflict_penalty
- unclear_terms_penalty
- stale_page_penalty
```

Recommended source priority:

- official FIFA tournament and squad material
- official confederation and national federation material
- reputable match databases with stable historical coverage
- reputable stats providers and analytics explainers
- general sports media only when official/stat sources do not cover the field

## Minimum Fields Needed

For the serious version of these formulas, WorldCupIQ should collect:

- team id, opponent id, confederation, venue, neutral-site flag
- match date, competition type, stage, and importance
- score, halftime score, extra time, penalties, red cards
- shots, shots on target, xG, possession, lineups if available
- rolling last-10 results and strength-of-schedule adjustments
- source provenance and freshness timestamps

## Validation Rules

- never trust one source alone if a second high-quality source can confirm it
- store source URL, retrieved time, and confidence per record
- separate raw ingestion from reviewed structured datasets
- mark data as confirmed, provisional, or conflicting
- calibrate probabilities, not just ranking accuracy
- test formulas on historical international matches, qualifiers, and tournament finals

## Overnight Expansion Target

Tonight's research worker should enrich this file with:

- preferred sources per data field
- formulas worth prototyping first
- formulas that need too much data for phase one
- validation tests for last-10-match form quality
- notes from Ollama or other local review passes
