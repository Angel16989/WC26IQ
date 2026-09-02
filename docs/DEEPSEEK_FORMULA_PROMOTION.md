# DeepSeek Formula Promotion

WorldCupIQ can automatically use a DeepSeek-approved formula without redesigning
the frontend.

The safe flow is:

1. VOID or a local model creates a candidate formula JSON.
2. DeepSeek reviews it.
3. If DeepSeek marks it as approved and gives it a strong enough quality score,
   the promotion script writes it to the API approved-formula path.
4. The prediction endpoint reads that file on each request.
5. The website automatically uses it because the website already calls the
   prediction endpoint.

## Why JSON Only

DeepSeek is allowed to approve numbers and metadata. It is not allowed to inject
Python code into the live app. That keeps the automation useful but controlled.

## Default Approved Formula Path

```bash
apps/api/app/data/approved_formula.json
```

That file is intentionally not created by default. If it is missing, invalid,
expired, or too low-score, the API uses the built-in
`worldcupiq-master-formula-v1` model.

## Required Candidate Shape

```json
{
  "formulaType": "worldcupiq-match-probability-v1",
  "version": "deepseek-formula-v1",
  "status": "approved",
  "approvedBy": "deepseek",
  "approvedAt": "2026-06-24T00:00:00Z",
  "expiresAt": "2026-07-24T00:00:00Z",
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
  "notes": [
    "DeepSeek approved this candidate after offline validation."
  ]
}
```

## Promotion Command

```bash
python3 integrations/VOID/scripts/promote_deepseek_formula.py path/to/deepseek-candidate.json
```

The script refuses to promote the formula unless the same API gate accepts it.

## Quality Gate

The API only uses the formula when:

- `formulaType` is `worldcupiq-match-probability-v1`
- `status` is `approved`
- `approvedBy` contains `deepseek`
- `qualityScore` is at least `WORLDCUPIQ_APPROVED_FORMULA_MIN_SCORE`
- `expiresAt` is empty or in the future
- all required numeric weights exist
- every weight is inside the allowed safety range

## Environment Overrides

```bash
WORLDCUPIQ_APPROVED_FORMULA_PATH=apps/api/app/data/approved_formula.json
WORLDCUPIQ_APPROVED_FORMULA_MIN_SCORE=0.82
```

## How To Tell It Is Live

Call the prediction endpoint with model notes enabled. If the formula is live,
the response `modelVersion` will be the DeepSeek formula version and the first
note will say it is using a DeepSeek-approved formula.
