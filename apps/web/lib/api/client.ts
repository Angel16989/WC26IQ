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

// ── Knockout types ──────────────────────────────────────────────────────────
export interface TeamRef { id: string; name: string; fifaCode: string; group?: string | null; }
export interface BracketMatch {
  matchId: string; stage: string; kickoffUtc: string | null; status: string;
  home: TeamRef | null; away: TeamRef | null;
  homeScore: number | null; awayScore: number | null;
  homeWinPct: number | null; awayWinPct: number | null; drawPct: number | null;
}
export interface KnockoutBracket { totalCompleted: number; totalScheduled: number; bracket: BracketMatch[]; }
export interface KeyMatch { stage: string; opponentId: string; opponentName: string; opponentFifa: string; winPct: number; }
export interface WinnerScenario {
  scenarioId: string; title: string; subtitle: string;
  championId: string; championName: string; championFifa: string;
  probability: number; narrative: string; keyMatches: KeyMatch[];
}
export interface ScenariosResponse { scenarios: WinnerScenario[]; modelVersion: string; note: string; }

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
  knockout: () => request<KnockoutBracket>("/knockout"),
  scenarios: () => request<ScenariosResponse>("/scenarios"),
  matchDetail: (id: string) => request<MatchDetail>(`/matches/${encodeURIComponent(id)}`),
};

// ── Match detail types ───────────────────────────────────────────────────
export interface KeyEvent {
  clock: string | null; eventType: string | null;
  teamName: string | null; teamId: string | null;
  playerName: string | null; text: string | null;
}
export interface StatRow { label: string; home: string | null; away: string | null; }
export interface TeamMatchInfo { id: string; name: string; fifaCode: string; score: number | null; }
export interface LineupPlayer { id: string; name: string; position: string; club: string; goalThreat: number; likelyStarter: boolean; }
export interface MatchDetail {
  matchId: string; stage: string; status: string; kickoffUtc: string | null; venue: string | null;
  home: TeamMatchInfo | null; away: TeamMatchInfo | null;
  keyEvents: KeyEvent[]; stats: StatRow[]; goals: KeyEvent[];
  homeLineup: LineupPlayer[]; awayLineup: LineupPlayer[];
}
