# AGENTS Summary

## Live Teams And Fixtures Pages

## What you did

- Replaced the frontend placeholder `Teams` and `Fixtures` routes with live API-backed views.
- Kept the existing layout style and card structure instead of redesigning the frontend.
- Added safe route-level fallback messaging when the backend is unavailable.

## How you did it

- Read `AGENTS.md`.
- Updated `apps/web/app/teams/page.tsx` to fetch `/teams` on the server and render team strength, form, squad depth, confederation coverage, and last-five results.
- Updated `apps/web/app/fixtures/page.tsx` to fetch `/fixtures` and `/teams` on the server and render live match rows with team names, stage, group, kickoff time, venue, and status.
- Kept both routes dynamic by using the existing API client fetch path instead of introducing frontend mock state.
- Verified the routes with the web lint and production build.

## What you changed

- Updated `apps/web/app/teams/page.tsx`.
- Updated `apps/web/app/fixtures/page.tsx`.
- Updated `AGENTS_SUMMARY.md`.

## How to verify it

- Run frontend lint:
- `npm run lint:web`
- Run frontend build:
- `npm run build:web`
- Start the backend and frontend:
- `uvicorn app.main:app --reload --app-dir apps/api`
- `npm run dev:web`
- Open:
- `http://localhost:3000/teams`
- `http://localhost:3000/fixtures`
- Expected result:
- `/teams` shows live team cards and summary metrics from the backend.
- `/fixtures` shows live fixture rows with team names, kickoff UTC, venue, stage, and status.

## When did you do it

- 2026-06-14T22:23:17+10:00

## StatsBomb And SportsMonks Provider Wiring

## What you did

- Added a provider-backed backend data path for teams, players, and fixtures.
- Wired the API to read the new SportsMonks key and provider settings from the repo env examples and real `.env` files.
- Integrated StatsBomb open data as the analytics fallback dataset.
- Added automatic fallback so SportsMonks World Cup 2026 season access is tried first, then StatsBomb, then the local mock data.
- Kept the frontend contract unchanged.

## How you did it

- Read `AGENTS.md`.
- Added runtime env loading in `apps/api/app/core/settings.py`.
- Added clean provider modules in `apps/api/app/data/providers.py` and `apps/api/app/data/team_metadata.py`.
- Reworked `apps/api/app/data/repository.py` to resolve providers through a cached bundle instead of reading only mock JSON.
- Used the official StatsBomb open-data structure to derive team ratings, recent form, player goal threat, and completed World Cup fixtures.
- Used the official SportsMonks World Cup 2026 season docs and the repo token to wire the season endpoints, then verified the current plan falls back because that season is not accessible on this token.
- Added repository fallback tests and kept endpoint tests pinned to the mock provider for deterministic local verification.

## What you changed

- Updated `apps/api/app/core/settings.py`.
- Added `apps/api/app/data/providers.py`.
- Added `apps/api/app/data/team_metadata.py`.
- Updated `apps/api/app/data/repository.py`.
- Updated `apps/api/app/main.py`.
- Updated `apps/api/tests/conftest.py`.
- Added `apps/api/tests/test_repository_providers.py`.
- Updated `apps/api/.env.example`.
- Updated `.env.example`.
- Updated `README.md`.

## How to verify it

- Run API tests:
- `apps/api/.venv/bin/python -m pytest apps/api/tests`
- Run API lint:
- `apps/api/.venv/bin/python -m ruff check apps/api`
- Smoke test the real provider stack:
- `cd apps/api && .venv/bin/python - <<'PY'
from app.core.settings import get_settings
from app.data.repository import get_data_bundle, get_fixtures, get_players, get_teams
get_settings.cache_clear()
get_data_bundle.cache_clear()
get_teams.cache_clear()
get_players.cache_clear()
get_fixtures.cache_clear()
bundle = get_data_bundle()
print(len(bundle.teams), len(bundle.players), len(bundle.fixtures))
PY`
- Expected current behavior with the repo token:
- SportsMonks World Cup 2026 season lookup logs a fallback warning, then StatsBomb loads `32` teams, `829` players, and `64` fixtures.

## When did you do it

- 2026-06-14T22:18:19+10:00

## Tower PostgreSQL Warehouse

## What you did

- Created a local PostgreSQL data warehouse for WorldCupIQ on the tower PC.
- Kept it free/private by using a local Docker Postgres container instead of BigQuery.
- Added warehouse schemas for raw source packs, core teams/groups, future fixtures/players/coaches/match history, model runs, quality checks, and marts.
- Loaded the latest verified FIFA source pack into the warehouse.
- Loaded raw VOID job JSON and Markdown job reports into the warehouse so model/research outputs are queryable too.

## How you did it

- Read `AGENTS.md`.
- Checked the tower for PostgreSQL, Docker, passwordless sudo, disk, and Python.
- Added `warehouse/schema.sql`, warehouse setup/refresh scripts, and loader scripts inside `integrations/VOID`.
- Started Docker container `wciq-warehouse-postgres` bound to `127.0.0.1:55432`.
- Generated local warehouse credentials in `/home/theimp/WCIQ_VOID/.secrets/warehouse.env`.
- Applied the schema, refreshed the source pack, loaded it, then loaded VOID runtime jobs/reports.
- Rotated the generated warehouse password after removing secret-printing from the setup script.

## What you changed

- Added `integrations/VOID/warehouse/schema.sql`.
- Added `integrations/VOID/warehouse/README.md`.
- Added `integrations/VOID/scripts/load_source_pack_to_warehouse.py`.
- Added `integrations/VOID/scripts/load_void_runtime_to_warehouse.py`.
- Added `integrations/VOID/scripts/setup_worldcupiq_warehouse.sh`.
- Added `integrations/VOID/scripts/refresh_worldcupiq_warehouse.sh`.
- Updated `integrations/VOID/runtime.env.example` with warehouse settings.
- Tower warehouse loaded latest run `worldcupiq-source-pack-20260613T123410Z`.
- Tower warehouse status: 12 groups, 48 teams, 41 VOID jobs, 8 VOID job reports.

## How to verify it

- Check the tower warehouse container:
- `ssh theimp@100.75.101.89 'docker ps --filter name=wciq-warehouse-postgres --format "{{.Names}} {{.Status}} {{.Ports}}"'`
- Refresh the warehouse:
- `ssh theimp@100.75.101.89 'cd /home/theimp/WCIQ_VOID && scripts/refresh_worldcupiq_warehouse.sh'`
- Query current warehouse status:
- `ssh theimp@100.75.101.89 'cd /home/theimp/WCIQ_VOID && set -a && . .secrets/warehouse.env && set +a && DATABASE_URL="postgresql://${WCIQ_WAREHOUSE_USER}:${WCIQ_WAREHOUSE_PASSWORD}@${WCIQ_WAREHOUSE_HOST}:${WCIQ_WAREHOUSE_PORT}/${WCIQ_WAREHOUSE_DB}" && psql "$DATABASE_URL" -c "select * from mart.current_warehouse_status;"'`
- Query latest group snapshot:
- `ssh theimp@100.75.101.89 'cd /home/theimp/WCIQ_VOID && set -a && . .secrets/warehouse.env && set +a && DATABASE_URL="postgresql://${WCIQ_WAREHOUSE_USER}:${WCIQ_WAREHOUSE_PASSWORD}@${WCIQ_WAREHOUSE_HOST}:${WCIQ_WAREHOUSE_PORT}/${WCIQ_WAREHOUSE_DB}" && psql "$DATABASE_URL" -c "select group_name, group_position, fifa_code, team_name from mart.latest_group_snapshot order by group_name, group_position;"'`

## When did you do it

- 2026-06-13T22:34:47+10:00

## Live Model Status Confirmation

## What you did

- Verified whether the current VOID/model setup is actually working.
- Confirmed the tower services, installed local models, and latest source-pack output.
- Clarified that the research/source-pack pipeline is working, while the full prediction model is not complete yet.

## How you did it

- Read `AGENTS.md`.
- Checked the local latest source pack JSON under `integrations/VOID/.void/research/source-packs/LATEST/`.
- Checked the tower with SSH for `void-research.service`, `void-dashboard.service`, `void-langgraph.service`, installed Ollama models, and the tower latest source-pack verdict.

## What you changed

- Updated this `AGENTS_SUMMARY.md` entry.

## How to verify it

- Check local latest source-pack verdict:
- `python3 - <<'PY'
import json
from pathlib import Path
data=json.loads(Path("integrations/VOID/.void/research/source-packs/LATEST/source_pack.json").read_text())
print(data["verdict"])
PY`
- Check tower services/model/source pack:
- `ssh theimp@100.75.101.89 'cd /home/theimp/WCIQ_VOID && systemctl --user is-active void-research.service void-dashboard.service void-langgraph.service && /home/theimp/.local/ollama/bin/ollama list && readlink .void/research/source-packs/LATEST'`

## When did you do it

- 2026-06-13T22:24:44+10:00

## Serious Source-Pack Recovery

## What you did

- Treated the weak second-round VOID reports as a failed research experiment.
- Added a deterministic WorldCupIQ source-pack builder so VOID starts from source evidence instead of broad model prompts.
- Generated and verified a local and tower-produced source pack from official FIFA sources.
- Extracted all 12 World Cup 2026 groups and 48 teams from the official FIFA schedule PDF.
- Tightened the report quality gate so team/group jobs are not rejected for squad/player terms unless they are actually primary squad/player tasks.

## How you did it

- Read `AGENTS.md`.
- Added `scripts/build_worldcupiq_source_pack.py` inside the isolated VOID integration.
- Downloaded the official FIFA schedule PDF, converted it with `pdftotext`, parsed the group/team table, and wrote JSON/Markdown artifacts under `.void/research/source-packs/`.
- Probed official FIFA pages and high-confidence source leads, recording reachable sources and explicit failures.
- Ran the builder locally and then on `/home/theimp/WCIQ_VOID` on the tower.
- Pulled the tower-generated source pack back into the local VOID runtime data folder.

## What you changed

- Added `integrations/VOID/scripts/build_worldcupiq_source_pack.py`.
- Updated `integrations/VOID/src/void_core/report_quality.py`.
- Generated ignored runtime artifacts under `integrations/VOID/.void/research/source-packs/`.
- Latest verified local/tower pack: `integrations/VOID/.void/research/source-packs/worldcupiq-source-pack-20260613T121803Z/`.
- Cleaned accidental nested sync folders from the tower after correcting the sync paths.

## How to verify it

- Run the builder locally:
- `python3 integrations/VOID/scripts/build_worldcupiq_source_pack.py`
- Read the latest local source pack:
- `sed -n '1,180p' integrations/VOID/.void/research/source-packs/LATEST/SOURCE_PACK.md`
- Verify tower reproducibility:
- `ssh theimp@100.75.101.89 'cd /home/theimp/WCIQ_VOID && python3 scripts/build_worldcupiq_source_pack.py && sed -n "1,120p" .void/research/source-packs/LATEST/SOURCE_PACK.md'`
- Confirm the official extraction count:
- `python3 - <<'PY'
import json
from pathlib import Path
data=json.loads(Path("integrations/VOID/.void/research/source-packs/LATEST/source_pack.json").read_text())
print(data["verdict"])
PY`

## When did you do it

- 2026-06-13T22:19:05+10:00

## Second-Round Status Check

## What you did

- Checked the tower VOID status for the second-round WorldCupIQ research run.
- Synced the completed second-round reports back into the local project.
- Verified whether the run produced trustworthy source-backed outputs.

## How you did it

- Read `AGENTS.md`.
- Queried `/home/theimp/WCIQ_VOID` on the tower through SSH.
- Checked the VOID job list, report folder, watcher process, worker services, and recent worker logs.
- Copied the active report files from the tower into `integrations/VOID/.void/research/job-reports/` with `rsync`.
- Read the final quality review and representative failed/completed reports.

## What you changed

- Synced 8 second-round report files into `integrations/VOID/.void/research/job-reports/`.
- Updated this `AGENTS_SUMMARY.md` entry.

## How to verify it

- Check tower job status:
- `ssh theimp@100.75.101.89 'cd /home/theimp/WCIQ_VOID && ./.void-venv/bin/python scripts/jobpulse_pm.py jobs | head -n 40'`
- Check local synced reports:
- `find integrations/VOID/.void/research/job-reports -maxdepth 1 -type f -printf '%f\n' | sort`
- Read the final second-round review:
- `sed -n '1,240p' integrations/VOID/.void/research/job-reports/job-20260612232803-a947d70b.md`

## When did you do it

- 2026-06-13T22:11:50+10:00

## Second-Round Verified Research Setup

## What you did

- Prepared VOID for a cleaner second research round while the user is offline.
- Archived the bad first-round reports out of the active report folder.
- Added a hard report-quality gate so weak/fallback reports are failed instead of marked completed.
- Added negative training notes that define bad first-round output patterns.
- Installed and activated `qwen3:8b` as the stronger free local writer/final model on the tower.
- Queued a narrower second-round WorldCupIQ research batch and started a watcher to queue the final review after the source jobs finish.

## How you did it

- Read `AGENTS.md`.
- Added `report_quality.py` and wired it into `research_worker.py`.
- Changed `jobpulse_pm.py` so queued `research:` jobs no longer fall back to repo-memory answers when source-backed research fails.
- Added archive, second-round queue, and final-review watcher scripts.
- Fixed a multi-worker temp-file race in `research_queue.py`.
- Pulled `qwen3:8b` with Ollama on the tower and updated tower runtime model settings.
- Restarted research workers and verified active jobs/processes.

## What you changed

- `integrations/VOID/src/void_core/report_quality.py`
- `integrations/VOID/src/void_core/research_worker.py`
- `integrations/VOID/src/void_core/research_queue.py`
- `integrations/VOID/src/void_core/jobpulse_pm.py`
- `integrations/VOID/scripts/archive_void_reports.sh`
- `integrations/VOID/scripts/queue_worldcupiq_second_round_research.sh`
- `integrations/VOID/scripts/wait_for_second_round_and_queue_review.sh`
- `integrations/VOID/runtime.env.example`
- `integrations/VOID/void/REPORT_QUALITY_TRAINING.md`
- Tower runtime config at `/home/theimp/WCIQ_VOID/.secrets/runtime.env`
- Tower active model set: `qwen3:8b` for writer/final, `deepseek-r1:1.5b` for audit.
- Archived first-round reports to `.void/research/archived-job-reports/bad-first-round-20260613`.

## How to verify it

- Check tower jobs:
- `ssh theimp@100.75.101.89 'cd /home/theimp/WCIQ_VOID && ./.void-venv/bin/python scripts/jobpulse_pm.py jobs | head -n 24'`
- Check active reports:
- `ssh theimp@100.75.101.89 'find /home/theimp/WCIQ_VOID/.void/research/job-reports -maxdepth 1 -type f -name "*.md" | sort'`
- Check archived old reports:
- `ssh theimp@100.75.101.89 'find /home/theimp/WCIQ_VOID/.void/research/archived-job-reports/bad-first-round-20260613 -maxdepth 1 -type f -name "*.md" | wc -l'`
- Check workers and watcher:
- `ssh theimp@100.75.101.89 'systemctl --user status void-research.service void-research-burst-1.service void-research-burst-2.service void-research-burst-3.service void-research-burst-4.service --no-pager && pgrep -af wait_for_second_round'`
- Check model:
- `ssh theimp@100.75.101.89 '/home/theimp/.local/ollama/bin/ollama list | grep qwen3:8b'`

## When did you do it

- 2026-06-13T09:22:01+10:00

## Real LangGraph Studio Integration

## What you did

- Installed the real LangGraph CLI/in-memory Agent Server dependencies locally and on the tower.
- Added a real LangGraph app for VOID research visualization.
- Started `void-langgraph.service` on the tower at `127.0.0.1:2024`.
- Connected the existing VOID dashboard Visual Lab panel to the live LangGraph Agent Server.
- Verified the graph can stream node updates through the LangGraph SDK.

## How you did it

- Read `AGENTS.md`.
- Used official LangGraph local-server/application-structure docs to follow the `langgraph dev` + `langgraph.json` flow.
- Added `langgraph-cli[inmem]` and `langgraph` to VOID requirements.
- Created `langgraph.json` and `langgraph_app/void_research/graph.py`.
- Added `scripts/install_void_langgraph_service.sh` to install and run the Agent Server through systemd.
- Synced the files to `/home/theimp/WCIQ_VOID` and `/home/theimp/WorldCupIQ/integrations/VOID`.
- Ran `langgraph validate`, started the tower service, checked HTTP health, and streamed a test run through `langgraph_sdk`.

## What you changed

- `integrations/VOID/requirements.txt`
- `integrations/VOID/langgraph.json`
- `integrations/VOID/langgraph_app/pyproject.toml`
- `integrations/VOID/langgraph_app/void_research/__init__.py`
- `integrations/VOID/langgraph_app/void_research/graph.py`
- `integrations/VOID/scripts/install_void_langgraph_service.sh`
- `integrations/VOID/scripts/setup_void_on_tower.sh`
- `integrations/VOID/README.md`
- Tower service: `void-langgraph.service`

## How to verify it

- Open VOID dashboard:
- `http://127.0.0.1:8787`
- Open LangGraph Studio:
- `https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024`
- Check local tunnels:
- `ss -ltnp | rg ':8787\\b|:2024\\b'`
- Check tower services:
- `ssh theimp@100.75.101.89 'systemctl --user status void-langgraph.service void-dashboard.service --no-pager'`
- Validate config:
- `cd integrations/VOID && ./.void-venv/bin/langgraph validate --config langgraph.json`
- Test API:
- `curl http://127.0.0.1:2024/`

## When did you do it

- 2026-06-13T09:04:53+10:00

## Verified VOID Visual Dashboard

## What you did

- Confirmed that VOID has a visual web dashboard called the Control Room.
- Verified the tower dashboard service is active.
- Verified the dashboard responds over HTTP.
- Opened a local SSH tunnel so the dashboard can be accessed from the laptop browser.

## How you did it

- Read `AGENTS.md`.
- Checked dashboard docs and code in `integrations/VOID/README.md`, `dashboard.py`, and `install_void_dashboard_service.sh`.
- Checked `void-dashboard.service` on the tower.
- Tested the tower dashboard with `curl`.
- Started an SSH tunnel from local port `8787` to the tower dashboard.

## What you changed

- Started a local SSH tunnel process:
- `ssh -fN -L 8787:127.0.0.1:8787 theimp@100.75.101.89`
- Updated this `AGENTS_SUMMARY.md` entry.

## How to verify it

- Open `http://127.0.0.1:8787` in a browser.
- Check the local tunnel:
- `ss -ltnp | rg ':8787\\b'`
- Check the tower service:
- `ssh theimp@100.75.101.89 'systemctl --user status void-dashboard.service --no-pager'`

## When did you do it

- 2026-06-13T08:56:12+10:00

## Explained VOID Research Flow

## What you did

- Traced the actual VOID research flow from the local code and tower runtime config.
- Identified what tools are currently used for research and model review.
- Identified why completed reports can still contain bad content.

## How you did it

- Read `AGENTS.md`.
- Inspected `research_queue.py`, `research_worker.py`, `research_job_runner.py`, and `jobpulse_pm.py`.
- Checked the tower runtime flags from `/home/theimp/WCIQ_VOID/.secrets/runtime.env` without exposing secrets.
- Summarized the queue, worker, search, model, report, and failure-gate behavior.

## What you changed

- Updated this `AGENTS_SUMMARY.md` entry only.

## How to verify it

- Inspect the flow files:
- `integrations/VOID/src/void_core/research_queue.py`
- `integrations/VOID/src/void_core/research_worker.py`
- `integrations/VOID/src/void_core/research_job_runner.py`
- `integrations/VOID/src/void_core/jobpulse_pm.py`
- Check tower runtime flags with:
- `ssh theimp@100.75.101.89 'cd /home/theimp/WCIQ_VOID && grep -E "^(OPENCLAW|VOID_|OLLAMA_HOST)=" .secrets/runtime.env'`

## When did you do it

- 2026-06-13T08:54:28+10:00

## Created Completed Reports Index

## What you did

- Created a readable completed-results list for the VOID overnight research batch.
- Classified each completed report by content usefulness instead of only worker status.
- Confirmed that most completed reports are not useful enough to treat as validated WorldCupIQ research.

## How you did it

- Read `AGENTS.md`.
- Inspected all synced Markdown reports under `integrations/VOID/.void/research/job-reports/`.
- Extracted each report's topic, status, and result quality.
- Added a human-friendly index with links, verdicts, and next-run recommendations.

## What you changed

- Added `integrations/VOID/.void/research/job-reports/COMPLETED_REPORTS_INDEX.md`.
- Updated this `AGENTS_SUMMARY.md` entry.

## How to verify it

- Open `integrations/VOID/.void/research/job-reports/COMPLETED_REPORTS_INDEX.md`.
- Count completed report files with:
- `find integrations/VOID/.void/research/job-reports -maxdepth 1 -type f -name 'job-*.md' | wc -l`
- Review any linked report from the index to confirm the verdict.

## When did you do it

- 2026-06-13T08:51:17+10:00

## Located VOID Research Results

## What you did

- Found the completed VOID research reports on the tower.
- Pulled the reports into the local workspace so they can be opened from the IDE.
- Checked the newest reports and identified that some generated outputs are low quality and should not be treated as validated WorldCupIQ data yet.

## How you did it

- Read `AGENTS.md`.
- Queried the tower job-report directory at `/home/theimp/WCIQ_VOID/.void/research/job-reports`.
- Listed the latest completed jobs through the tower VOID CLI.
- Synced the Markdown reports into `integrations/VOID/.void/research/job-reports/` locally.
- Opened the newest ensemble and morning reports to inspect their headings and result quality.

## What you changed

- Added local copies of the tower Markdown reports under `integrations/VOID/.void/research/job-reports/`.
- Updated this `AGENTS_SUMMARY.md` entry.

## How to verify it

- Local report folder:
- `find integrations/VOID/.void/research/job-reports -maxdepth 1 -type f -name '*.md' | sort`
- Tower report folder:
- `ssh theimp@100.75.101.89 'find /home/theimp/WCIQ_VOID/.void/research/job-reports -maxdepth 1 -type f -name "*.md" | sort | tail -n 25'`
- Tower job status:
- `ssh theimp@100.75.101.89 'cd /home/theimp/WCIQ_VOID && ./.void-venv/bin/python scripts/jobpulse_pm.py jobs | head -n 25'`

## When did you do it

- 2026-06-13T08:45:54+10:00

## OpenClaw + LangChain Search Ensemble

## What you did

- Added LangChain/DuckDuckGo as a second research lane beside OpenClaw.
- Kept OpenClaw as the primary search path and Bing RSS as a fallback.
- Added formula guidance for combining multiple model families into one calibrated WorldCupIQ master formula.
- Queued tower jobs to compare OpenClaw, LangChain, and fallback search results before trusting source data.
- Fixed VOID queue/burst scripts so they work from the standalone `/home/theimp/WCIQ_VOID` runtime without requiring a git checkout.

## How you did it

- Added LangChain community search dependencies to the VOID requirements.
- Added `VOID_SEARCH_PROVIDERS=openclaw,langchain,bing` runtime configuration.
- Updated the VOID research code to call a provider ensemble, tag each result by provider, dedupe URLs, and prefer trusted source domains.
- Synced the changed VOID files to both `/home/theimp/WCIQ_VOID` and `/home/theimp/WorldCupIQ/integrations/VOID`.
- Ran local syntax checks, compiled the Python files, ran a tower smoke test, and queued the ensemble audit jobs.

## What you changed

- `integrations/VOID/requirements.txt`
- `integrations/VOID/runtime.env.example`
- `integrations/VOID/src/void_core/jobpulse_pm.py`
- `integrations/VOID/scripts/queue_worldcupiq_search_ensemble_audit.sh`
- `integrations/VOID/scripts/queue_worldcupiq_overnight_research.sh`
- `integrations/VOID/scripts/start_void_research_burst.sh`
- `docs/FORMULA_CATALOG.md`
- Tower runtime config at `/home/theimp/WCIQ_VOID/.secrets/runtime.env`
- Tower queued jobs:
- `job-20260612161450-33a27df9`: search ensemble audit.
- `job-20260612161450-01c652bb`: formula ensemble audit.
- `job-20260612161450-02c9a178`: master formula synthesis.

## How to verify it

- Local checks:
- `bash -n integrations/VOID/scripts/queue_worldcupiq_search_ensemble_audit.sh integrations/VOID/scripts/queue_worldcupiq_overnight_research.sh integrations/VOID/scripts/start_void_research_burst.sh`
- `python3 -m compileall integrations/VOID/src/void_core integrations/VOID/scripts`
- Tower service check:
- `ssh theimp@100.75.101.89 'systemctl --user status void-research.service void-dashboard.service void-research-burst-1.service void-research-burst-2.service void-research-burst-3.service void-research-burst-4.service --no-pager'`
- Tower queue check:
- `ssh theimp@100.75.101.89 'cd /home/theimp/WCIQ_VOID && ./.void-venv/bin/python scripts/jobpulse_pm.py jobs | head -n 25'`
- Tower search smoke test returned OpenClaw and LangChain results for official FIFA World Cup 2026 fixture queries.

## When did you do it

- 2026-06-13T02:15:11+10:00

## Morning Verification Jobs

## What you did

- Added three final queued tower jobs so the overnight run ends with a double-check phase.
- Queued a final data audit, formula audit, and morning brief for WorldCupIQ.

## How you did it

- Used the live tower VOID CLI from `/home/theimp/WCIQ_VOID`.
- Queued the jobs with `requested_by=morning-double-verify` so they can be found easily in the job list.
- Left them behind the existing overnight queue so they run after the broader research jobs.

## What you changed

- Added queued tower jobs:
- `job-20260612160559-89641a2d`: morning final data audit.
- `job-20260612160600-9e9c1f13`: morning formula audit.
- `job-20260612160600-fb1fe5c3`: morning summary brief.
- Updated this `AGENTS_SUMMARY.md` entry.

## How to verify it

- `ssh theimp@100.75.101.89 'cd /home/theimp/WCIQ_VOID && ./.void-venv/bin/python scripts/jobpulse_pm.py jobs'`
- Tomorrow morning, inspect reports with:
- `ssh theimp@100.75.101.89 'find /home/theimp/WCIQ_VOID/.void/research/job-reports -maxdepth 1 -type f -name "*.md" | sort | tail -n 30'`

## When did you do it

- 2026-06-13T02:05:52+10:00

## Overnight OpenClaw Research Setup

## What you did

- Pinned VOID to the working tower OpenClaw binary and `worldcupiq` OpenClaw profile.
- Raised the overnight web-research depth and timeout limits.
- Expanded the overnight WorldCupIQ research queue from a small starter batch into a broad data, formula, squad, fixtures, last-10-match, source-quality, and validation sweep.
- Started four additional burst workers alongside the main `void-research.service` so the tower can process jobs in parallel overnight.
- Verified OpenClaw is actually running on the tower through live `openclaw` and `openclaw-infer` processes.

## How you did it

- Updated `integrations/VOID/src/void_core/jobpulse_pm.py` to support `OPENCLAW_PROFILE`, prioritize football data domains, and allow deeper OpenClaw result limits.
- Updated `integrations/VOID/src/void_core/research_queue.py` so completed jobs also produce Markdown reports under `.void/research/job-reports/`.
- Updated `integrations/VOID/runtime.env.example` with OpenClaw, timeout, source-limit, and model-review settings.
- Replaced `integrations/VOID/scripts/queue_worldcupiq_overnight_research.sh` with a larger overnight research queue.
- Added `integrations/VOID/scripts/start_void_research_burst.sh` and ran it on the tower with four workers.
- Synced the updated code to `/home/theimp/WorldCupIQ` and `/home/theimp/WCIQ_VOID`.

## What you changed

- `integrations/VOID/src/void_core/jobpulse_pm.py`
- `integrations/VOID/src/void_core/research_queue.py`
- `integrations/VOID/runtime.env.example`
- `integrations/VOID/scripts/queue_worldcupiq_overnight_research.sh`
- `integrations/VOID/scripts/start_void_research_burst.sh`
- Tower runtime config at `/home/theimp/WCIQ_VOID/.secrets/runtime.env`
- Tower services: `void-research.service` plus `void-research-burst-1.service` through `void-research-burst-4.service`

## How to verify it

- `ssh theimp@100.75.101.89 'systemctl --user status void-research.service void-research-burst-1.service void-research-burst-2.service void-research-burst-3.service void-research-burst-4.service --no-pager'`
- `ssh theimp@100.75.101.89 'pgrep -af openclaw'`
- `ssh theimp@100.75.101.89 'cd /home/theimp/WCIQ_VOID && ./.void-venv/bin/python scripts/jobpulse_pm.py jobs'`
- `ssh theimp@100.75.101.89 'find /home/theimp/WCIQ_VOID/.void/research/job-reports -maxdepth 1 -type f -name "*.md" | sort | tail -n 20'`

## When did you do it

- 2026-06-13T02:05:12+10:00

## What you did

- Shifted VOID toward a research-first runtime instead of a Slack-first runtime.
- Added a new formula catalog for WorldCupIQ at `docs/FORMULA_CATALOG.md`.
- Added a persistent overnight research queue and worker for long-running jobs.
- Synced the updated WorldCupIQ repo and `WCIQ_VOID` runtime to the tower.
- Installed the new tower research worker and queued overnight World Cup research jobs.

## How you did it

- Added a file-based research queue, a long-running worker daemon, and an isolated child-process job runner under `integrations/VOID/src/void_core/`.
- Updated VOID runtime scripts to support `.secrets/runtime.env` as the main config, with Slack left as optional legacy behavior.
- Added an overnight queue script that enqueues research and validation jobs for sources, teams, fixtures, last-10-match storage design, formulas, and validation rules.
- Created a runtime env example and updated setup/install scripts so the tower installs `void-research.service` by default.
- Synced local files to the tower with `rsync`, created `/home/theimp/WCIQ_VOID/.secrets/runtime.env`, ran `scripts/setup_void_on_tower.sh`, and queued the overnight jobs.

## What you changed

- Added `docs/FORMULA_CATALOG.md`.
- Added `integrations/VOID/runtime.env.example`.
- Added `integrations/VOID/scripts/install_void_research_service.sh`.
- Added `integrations/VOID/scripts/queue_worldcupiq_overnight_research.sh`.
- Added `integrations/VOID/scripts/void_research_worker.py`.
- Added `integrations/VOID/src/void_core/research_queue.py`.
- Added `integrations/VOID/src/void_core/research_worker.py`.
- Added `integrations/VOID/src/void_core/research_job_runner.py`.
- Updated `integrations/VOID/src/void_core/jobpulse_pm.py`, `dashboard.py`, `project_git_sync.py`, and `void_socket_bot.py`.
- Updated VOID tower setup/install scripts to load `runtime.env`, install the research worker, and disable Slack by default unless explicitly re-enabled.

## How to verify it

- Local syntax checks:
  - `bash -n integrations/VOID/scripts/install_void_research_service.sh integrations/VOID/scripts/install_void_socket_service.sh integrations/VOID/scripts/install_void_dashboard_service.sh integrations/VOID/scripts/install_void_timer.sh integrations/VOID/scripts/install_void_night_shift_timer.sh integrations/VOID/scripts/setup_void_on_tower.sh integrations/VOID/scripts/queue_worldcupiq_overnight_research.sh`
  - `python3 -m compileall integrations/VOID/src/void_core integrations/VOID/scripts`
- Tomorrow morning on the tower:
  - `systemctl --user status void-research.service`
  - `systemctl --user status void-dashboard.service`
  - `cat /home/theimp/WCIQ_VOID/.void/state/research-worker.json`
  - `ls /home/theimp/WCIQ_VOID/.void/jobs`
  - `find /home/theimp/WCIQ_VOID/.void/research -maxdepth 2 -type f | sort | tail -n 20`
- Check the new catalog file:
  - `docs/FORMULA_CATALOG.md`

## When did you do it

- 2026-06-13T01:58:41+10:00

## Live API Warehouse Sync And Baseline Training

## What you did

- Added live warehouse ingestion for StatsBomb and SportsMonks inside the isolated `integrations/VOID` runtime.
- Deployed that ingestion flow to the tower PC and ran the first end-to-end warehouse refresh.
- Built warehouse-backed training examples and trained the first baseline match-outcome model on the tower.
- Verified OpenClaw is installed and available on the tower alongside the VOID services.
- Kept the running app untouched and left this work isolated to the data/runtime side.

## How you did it

- Read `AGENTS.md`.
- Extended the VOID warehouse schema with API sync audit tables, raw API landing tables, and a training-example mart.
- Added a loader that fetches StatsBomb World Cup data plus SportsMonks season data, stores raw JSON snapshots, and normalizes the results into PostgreSQL.
- Added a training-example builder that derives chronological rolling match features from warehouse match and event history.
- Added a baseline training script using scikit-learn logistic regression and saved model artifacts plus metrics back into the warehouse/runtime folders.
- Synced `integrations/VOID` to `/home/theimp/WCIQ_VOID` on the tower, ran `scripts/setup_void_on_tower.sh`, ran `scripts/setup_worldcupiq_warehouse.sh`, and then ran `scripts/run_worldcupiq_model_training.sh`.
- Fixed the training wrapper so it no longer shell-sources `runtime.env`, which broke on human-readable values containing spaces.
- Fixed the baseline trainer for the installed scikit-learn version by removing the deprecated `multi_class` constructor argument.
- Confirmed the current SportsMonks token only returns subscription-limited empty results for season `26618`, so the sync is recorded as `partial` instead of pretending it succeeded.

## What you changed

- Updated `integrations/VOID/requirements.txt`.
- Updated `integrations/VOID/runtime.env.example`.
- Updated `integrations/VOID/warehouse/schema.sql`.
- Updated `integrations/VOID/warehouse/README.md`.
- Added `integrations/VOID/scripts/load_api_data_to_warehouse.py`.
- Added `integrations/VOID/scripts/build_training_examples_from_warehouse.py`.
- Added `integrations/VOID/scripts/train_worldcupiq_baseline_model.py`.
- Updated `integrations/VOID/scripts/setup_worldcupiq_warehouse.sh`.
- Updated `integrations/VOID/scripts/refresh_worldcupiq_warehouse.sh`.
- Added `integrations/VOID/scripts/run_worldcupiq_model_training.sh`.
- Updated `AGENTS_SUMMARY.md`.
- Tower live results:
- API sync run `worldcupiq-api-sync-20260614T124208Z`
- Training run `worldcupiq-training-20260614T124404Z`
- StatsBomb loaded `64` matches and `234637` events
- SportsMonks loaded `0` standings and `0` fixtures with subscription-limited responses on season `26618`
- Training examples built: `64`
- Baseline holdout metrics: accuracy `0.416667`, log loss `4.254057`, multiclass Brier `1.098925`

## How to verify it

- Syntax-check the new scripts locally:
- `python3 -m py_compile integrations/VOID/scripts/load_api_data_to_warehouse.py integrations/VOID/scripts/build_training_examples_from_warehouse.py integrations/VOID/scripts/train_worldcupiq_baseline_model.py`
- `bash -n integrations/VOID/scripts/setup_worldcupiq_warehouse.sh integrations/VOID/scripts/refresh_worldcupiq_warehouse.sh integrations/VOID/scripts/run_worldcupiq_model_training.sh`
- Confirm tower services and OpenClaw:
- `ssh theimp@100.75.101.89 'systemctl --user is-active void-research.service void-dashboard.service void-langgraph.service'`
- `ssh theimp@100.75.101.89 '/home/theimp/.nvm/versions/node/v22.22.2/bin/openclaw --version'`
- Re-run the live warehouse sync on the tower:
- `ssh theimp@100.75.101.89 'cd /home/theimp/WCIQ_VOID && bash scripts/setup_worldcupiq_warehouse.sh'`
- Query the latest API sync status:
- `ssh theimp@100.75.101.89 'bash -lc '\''source /home/theimp/WCIQ_VOID/.secrets/warehouse.env && DB_URL="postgresql://${WCIQ_WAREHOUSE_USER}:${WCIQ_WAREHOUSE_PASSWORD}@${WCIQ_WAREHOUSE_HOST}:${WCIQ_WAREHOUSE_PORT}/${WCIQ_WAREHOUSE_DB}" && psql "$DB_URL" -c "select * from mart.latest_api_sync_status;"'\'''
- Re-run model training on the tower:
- `ssh theimp@100.75.101.89 'cd /home/theimp/WCIQ_VOID && bash scripts/run_worldcupiq_model_training.sh'`
- Query the latest training status:
- `ssh theimp@100.75.101.89 'bash -lc '\''source /home/theimp/WCIQ_VOID/.secrets/warehouse.env && DB_URL="postgresql://${WCIQ_WAREHOUSE_USER}:${WCIQ_WAREHOUSE_PASSWORD}@${WCIQ_WAREHOUSE_HOST}:${WCIQ_WAREHOUSE_PORT}/${WCIQ_WAREHOUSE_DB}" && psql "$DB_URL" -c "select * from mart.latest_training_status;"'\'''
- Inspect the raw SportsMonks response captured by the sync:
- `ssh theimp@100.75.101.89 'sed -n "1,120p" /home/theimp/WCIQ_VOID/.void/warehouse/api-syncs/worldcupiq-api-sync-20260614T124208Z/sportsmonks/standings-26618.json'`

## When did you do it

- 2026-06-14T22:45:53+10:00
