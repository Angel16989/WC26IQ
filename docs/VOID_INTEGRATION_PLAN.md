# Void Integration Plan

## What Void Is For
VOID is a research and AI-agent style support system for WorldCupIQ. It is not the main user-facing app. Its role is to assist research, analysis workflows, Slack coordination, and internal tooling around the football prediction product.

## Where Void Should Go
WorldCupIQ keeps the VOID source in `integrations/VOID/`. When deployed to the tower PC, the recommended runtime folder is `/home/theimp/WCIQ_VOID`, while the linked WorldCupIQ project folder stays at `/home/theimp/WorldCupIQ`.

If you bring in newer or replacement VOID code later, keep it inside that isolated integration area and do not wire it into the web or API app until the team intentionally plans a real integration step.

## Why Void Should Stay Isolated First
- The base web and API app need a stable foundation first.
- Void may have separate dependencies, environment variables, and runtime requirements.
- Keeping it isolated reduces accidental coupling and makes reviews easier.

## Current Workspace Note
This workspace already contains a separate `integrations/VOID/` tree, and that code can run live as a separate Slack and dashboard helper runtime. It should still be treated as isolated support infrastructure rather than being folded into the main app runtime.

## Possible Future Responsibilities
- Research assistant for tournament and team context
- Data source checker for fixture, roster, and stats inputs
- Injury and news summariser
- Model explanation helper
- AI-agent workflow manager for internal analysis tasks

## What Not To Do Yet
- Do not wire VOID directly into the user-facing production app flow.
- Do not let Void modify predictions directly.
- Do not mix unfinished Void code into the main backend.
- Do not create frontend UI for Void yet.
- Do not merge environment variables without checking for overlap and naming conflicts.

## Future Integration Shape
A later integration can decide whether Void should:
- run as a separate service,
- expose controlled internal APIs,
- trigger offline research workflows, or
- publish reviewed summaries back into WorldCupIQ tooling.

That decision should happen only after the main web/API product paths and data contracts are stable.
