# WorldCupIQ

WorldCupIQ is a 2026 FIFA World Cup analytics and prediction app scaffold. This repository sets up the project foundation for a future product that can compare teams, evaluate form, estimate match outcomes, simulate tournament paths, and explain model outputs without using betting-oriented language or workflows.

## What Exists Today
- `apps/web`: a Next.js frontend scaffold with placeholder routes and a typed API client layer
- `apps/api`: a FastAPI backend with provider-backed teams/fixtures data and placeholder prediction logic
- `packages/shared`: shared TypeScript contracts for the web app
- `data`: root-level mock datasets for teams, players, fixtures, and predictions
- `database/schema.sql`: a future Supabase/PostgreSQL schema draft that is not wired in yet
- `integrations/VOID`: the separate VOID runtime source tree that can run beside WorldCupIQ without being imported into the web or API app

## Repo Structure
```text
worldcupiq/
  apps/
    api/
    web/
  data/
  database/
  docs/
  integrations/
    VOID/
  packages/
    shared/
```

## Data Providers
- The web routes are placeholders only and intentionally avoid final UI design.
- The API now supports `mock`, `statsbomb`, and `sportsmonks` data providers.
- `WORLDCUPIQ_DATA_PROVIDER=auto` tries SportsMonks World Cup 2026 season data first, enriches from StatsBomb open data when possible, and falls back to the root mock JSON when remote data is unavailable.
- The database schema is documentation for future work only.
- VOID runs as a separate helper runtime and is not coupled into the web or API runtime.

## Run The Frontend
1. Install Node dependencies:
   ```bash
   npm install
   ```
2. Copy the web environment example if needed:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```
3. Start the frontend:
   ```bash
   npm run dev:web
   ```
4. Open `http://localhost:3000`.

## Run The Backend
1. Create the virtual environment:
   ```bash
   python3 -m venv apps/api/.venv
   ```
2. Activate it:
   ```bash
   source apps/api/.venv/bin/activate
   ```
3. Bootstrap `pip` if your Python install does not include it yet:
   ```bash
   python -m ensurepip --upgrade
   ```
4. Install Python dependencies:
   ```bash
   python -m pip install -r apps/api/requirements.txt
   ```
5. Copy the API environment example if needed:
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```
6. Optional: choose the provider in `apps/api/.env`:
   - `WORLDCUPIQ_DATA_PROVIDER=auto` to try SportsMonks first and fall back automatically
   - `WORLDCUPIQ_DATA_PROVIDER=statsbomb` to use StatsBomb open data only
   - `WORLDCUPIQ_DATA_PROVIDER=mock` for fully local deterministic data
7. Start the API:
   ```bash
   uvicorn app.main:app --reload --app-dir apps/api
   ```
8. Open `http://localhost:8000/docs`.

## Quality Checks
- Frontend lint:
  ```bash
  npm run lint:web
  ```
- Frontend build:
  ```bash
  npm run build:web
  ```
- API lint:
  ```bash
  source apps/api/.venv/bin/activate && python -m ruff check apps/api
  ```
- API tests:
  ```bash
  source apps/api/.venv/bin/activate && python -m pytest apps/api/tests
  ```

## VOID Status
VOID is a live companion runtime for WorldCupIQ. Its source lives in `integrations/VOID/`, and the recommended tower deployment folder is `/home/theimp/WCIQ_VOID` with the linked project repo at `/home/theimp/WorldCupIQ`.

Slack is the primary live output for VOID right now, and the Control Room dashboard is the secondary inspection surface. VOID still stays isolated from the frontend, backend, and shared package codepaths.

## Recommended Next Steps
1. Connect the placeholder Teams and Fixtures pages to live API responses.
2. Calibrate the current StatsBomb and SportsMonks provider blend with first-party 2026 tournament and squad data.
3. Expand the prediction engine beyond placeholder heuristics into measurable model experiments.
4. Add tournament-table calculations and richer simulator outputs.
5. Plan the first intentional Void integration after the base web/API workflow is stable.
