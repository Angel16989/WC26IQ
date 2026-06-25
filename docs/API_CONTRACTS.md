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
- The TypeScript contracts in `packages/shared` and the Pydantic schemas in `apps/api/app/schemas` should stay aligned as the API evolves.
