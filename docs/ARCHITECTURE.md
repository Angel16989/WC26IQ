# WorldCupIQ Architecture

## Overview
WorldCupIQ is split into a small web app, a small API, shared TypeScript contracts, and root-level mock data. The goal of this setup is to make the project easy to understand now and easy to grow later.

## Frontend
The frontend lives in `apps/web` and uses Next.js App Router with TypeScript. Right now it only contains placeholder pages and a typed API client layer. This means the route structure exists, but the final visual design and deep data flows are intentionally deferred.

## Backend
The backend lives in `apps/api` and uses FastAPI. It exposes clean endpoints for health, teams, fixtures, match prediction, and tournament simulation. The match prediction path now uses the staged WorldCupIQ master formula: team-strength prior, recent form, squad depth, expected goals, and a Poisson scoreline matrix.

## Shared Types
The shared TypeScript contracts live in `packages/shared`. These types define the shape of teams, players, matches, predictions, group tables, and simulation responses on the frontend side. The FastAPI schemas mirror those shapes manually so the contracts stay aligned while the backend remains Python-based.

## Mock Data
The `data/` folder is the single source of mock truth for now. Keeping it at the repository root makes it easier to replace with real datasets later and helps both documentation and backend services point to the same files.

## Optional Database
The `database/schema.sql` file documents the optional PostgreSQL runtime schema. The API only writes to it when `WORLDCUPIQ_DATABASE_URL` is configured; local mock mode still works without a database.

## Prediction Engine
The current prediction logic is deterministic and explainable on purpose. It uses the local data provider fields available today, then marks deeper layers like Dixon-Coles correction, Brier/log-loss calibration, and source-backed player availability as pending until the historical match and squad datasets are clean.

## Future Void Integration
Void remains a separate research and AI-agent style system. The backend can use conclusions from Void research artifacts, but it does not import or run Void as part of the web/API app.
