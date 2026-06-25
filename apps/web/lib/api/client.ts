import type {
  HealthResponse,
  Match,
  MatchPredictionRequest,
  MatchPredictionResponse,
  Player,
  Team,
  TournamentSimulationRequest,
  TournamentSimulationResponse,
} from "@worldcupiq/shared";
import { apiConfig } from "./config";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export const apiClient = {
  health: () => request<HealthResponse>("/health"),
  teams: () => request<Team[]>("/teams"),
  team: (id: string) => request<Team>(`/teams/${encodeURIComponent(id)}`),
  teamPlayers: (id: string) => request<Player[]>(`/teams/${encodeURIComponent(id)}/players`),
  fixtures: () => request<Match[]>("/fixtures"),
  predictMatch: (payload: MatchPredictionRequest) =>
    request<MatchPredictionResponse>("/predict/match", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  simulateTournament: (payload: TournamentSimulationRequest) =>
    request<TournamentSimulationResponse>("/simulate/tournament", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
