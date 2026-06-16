# WorldCupIQ Architecture

## Overview
WorldCupIQ is split into a small web app, a small API, shared TypeScript contracts, and root-level mock data. The goal of this setup is to make the project easy to understand now and easy to grow later.

## Frontend
The frontend lives in `apps/web` and uses Next.js App Router with TypeScript. Right now it only contains placeholder pages and a typed API client layer. This means the route structure exists, but the final visual design and deep data flows are intentionally deferred.

## Backend
The backend lives in `apps/api` and uses FastAPI. It exposes a few clean endpoints for health, teams, fixtures, match prediction, and tournament simulation. The current logic is placeholder logic only, built on top of mock JSON data.

## Shared Types
The shared TypeScript contracts live in `packages/shared`. These types define the shape of teams, players, matches, predictions, group tables, and simulation responses on the frontend side. The FastAPI schemas mirror those shapes manually so the contracts stay aligned while the backend remains Python-based.

## Mock Data
The `data/` folder is the single source of mock truth for now. Keeping it at the repository root makes it easier to replace with real datasets later and helps both documentation and backend services point to the same files.

## Future Database
The `database/schema.sql` file is only a draft for a future Supabase/PostgreSQL setup. It documents likely tables and relationships, but nothing in the running app reads from it yet.

## Future Prediction Engine
The current prediction logic is deterministic and lightweight on purpose. It is only there to support API structure and future UI integration. More advanced methods like Elo, Poisson, Dixon-Coles, xG-driven estimates, Monte Carlo simulation, and player-level scorer probabilities belong in a later phase once real datasets and validation workflows are ready.

## Future Void Integration
Void is planned as a separate research and AI-agent style system. For now it has a reserved folder and documentation only. This keeps the main web/API app stable while leaving a clear place for future integration work.

