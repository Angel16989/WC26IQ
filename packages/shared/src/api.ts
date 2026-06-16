import type {
  GoalProjection,
  GroupTable,
  Match,
  Player,
  PredictionConfidence,
  Team,
  TeamProbability,
  TournamentStage,
} from "./types";

export interface HealthResponse {
  status: "ok";
  service: string;
  version: string;
}

export interface MatchPredictionRequest {
  homeTeamId: string;
  awayTeamId: string;
  includeLikelyScorers?: boolean;
  includeModelNotes?: boolean;
}

export interface LikelyScorerPrediction {
  playerId: string;
  name: string;
  teamId: string;
  probability: number;
}

export interface MatchPredictionResponse {
  match: {
    homeTeamId: string;
    awayTeamId: string;
    homeTeamName: string;
    awayTeamName: string;
  };
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  expectedGoals: GoalProjection;
  likelyScorers: LikelyScorerPrediction[];
  confidence: PredictionConfidence;
  modelVersion: string;
  explanation: string;
  notes?: string[];
}

export interface TournamentSimulationRequest {
  iterations?: number;
  seed?: number;
  startingStage?: TournamentStage;
}

export interface TournamentSimulationResponse {
  iterations: number;
  seed: number;
  startingStage: TournamentStage;
  winnerProbabilities: TeamProbability[];
  finalists: TeamProbability[];
  semiFinalists: TeamProbability[];
  projectedGroupTables: GroupTable[];
  notes: string[];
}

export interface WorldCupDataset {
  teams: Team[];
  players: Player[];
  fixtures: Match[];
}
