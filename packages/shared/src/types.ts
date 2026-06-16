export type MatchResultCode = "W" | "D" | "L";

export type TournamentStage =
  | "group"
  | "round_of_16"
  | "quarterfinal"
  | "semifinal"
  | "third_place"
  | "final";

export type MatchStatus = "scheduled" | "live" | "final" | "postponed";

export type PredictionConfidence = "low" | "medium" | "high";

export interface Team {
  id: string;
  name: string;
  fifaCode: string;
  confederation: string;
  group?: string;
  strengthRating: number;
  formIndex: number;
  squadStrength: number;
  lastFiveResults: MatchResultCode[];
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  position: string;
  club: string;
  clubFormIndex: number;
  goalThreat: number;
  likelyStarter: boolean;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffUtc: string;
  venue: string;
  stage: TournamentStage;
  group?: string;
  status: MatchStatus;
}

export interface Prediction {
  id: string;
  matchId: string;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  expectedGoals: GoalProjection;
  likelyScorers: string[];
  confidence: PredictionConfidence;
  explanation: string;
  modelVersion: string;
  generatedAt: string;
}

export interface GoalProjection {
  home: number;
  away: number;
}

export interface GroupTableRow {
  teamId: string;
  teamName: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  qualificationStatus: "projected_advance" | "projected_eliminate";
}

export interface GroupTable {
  group: string;
  standings: GroupTableRow[];
}

export interface TeamProbability {
  teamId: string;
  teamName: string;
  probability: number;
}
