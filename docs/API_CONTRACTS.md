# API Contracts

## Base URL
- Local API base URL: `http://localhost:8000`

## `GET /health`
Returns a simple service health payload.

Example response:
```json
{
  "status": "ok",
  "service": "worldcupiq-api",
  "version": "0.1.0"
}
```

## `GET /admin/data-freshness`
Returns a freshness report for the currently loaded football dataset. This is the safety check that tells the app and VOID whether teams, players, fixtures, and live-score coverage look current enough to trust.

Example response:
```json
{
  "status": "stale",
  "checkedAtUtc": "2026-06-29T10:00:00Z",
  "provider": "mock",
  "liveScoreMode": "not_configured",
  "liveScoreTargetIntervalSeconds": 3,
  "teams": 8,
  "players": 64,
  "fixtures": 6,
  "staleFixtures": 6,
  "liveWindowFixtures": 0,
  "nextKickoffUtc": null,
  "latestKickoffUtc": "2026-06-21T02:00:00Z",
  "issues": [
    {
      "severity": "critical",
      "code": "past_scheduled_fixture",
      "message": "A fixture is well past kickoff but is still marked scheduled.",
      "recommendation": "Refresh match status, score, and result data from an approved source.",
      "fixtureId": "a1"
    }
  ],
  "nextActions": [
    "Refresh fixture status and score fields from the latest approved source."
  ]
}
```

The checker is intentionally strict. If `WORLDCUPIQ_LIVE_SCORE_MODE=not_configured`, the API should not claim second-by-second live scores.

## `GET /teams`
Returns the list of mock teams.

Response shape:
- `Team[]`

## `GET /fixtures`
Returns the list of mock fixtures.

Response shape:
- `Match[]`

## `POST /predict/match`
Creates a match prediction from two team IDs using the WorldCupIQ master formula.

Example request:
```json
{
  "homeTeamId": "arg",
  "awayTeamId": "jpn",
  "includeLikelyScorers": true,
  "includeModelNotes": true
}
```

Example response:
```json
{
  "match": {
    "homeTeamId": "arg",
    "awayTeamId": "jpn"
  },
  "homeWinProbability": 0.63,
  "drawProbability": 0.22,
  "awayWinProbability": 0.15,
  "expectedGoals": {
    "home": 1.8,
    "away": 0.8
  },
  "likelyScorers": [
    {
      "playerId": "arg-alvarez",
      "name": "Julian Alvarez",
      "teamId": "arg",
      "probability": 0.43
    }
  ],
  "confidence": "medium",
  "modelVersion": "worldcupiq-master-formula-v1",
  "explanation": "Argentina grades higher in the master formula after team strength, recent form, squad depth, and expected goals are converted through a Poisson scoreline matrix."
}
```

## `POST /simulate/tournament`
Returns a placeholder tournament simulation summary.

Example request:
```json
{
  "iterations": 1000,
  "seed": 2026,
  "startingStage": "group"
}
```

Example response highlights:
- `winnerProbabilities`
- `projectedGroupTables`
- `semiFinalists`
- `finalists`
- `notes`

## Notes
- The current API is built on mock data only.
- Prediction responses use the staged master formula. They are still not production-calibrated until source-backed match history, Dixon-Coles correction, and calibration metrics are added.
- Data freshness is monitored separately from prediction quality. A prediction can be mathematically valid and still use stale source data; check `/admin/data-freshness` before presenting data as current.
- The TypeScript contracts in `packages/shared` and the Pydantic schemas in `apps/api/app/schemas` should stay aligned as the API evolves.
