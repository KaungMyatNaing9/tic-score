export type AgentId = "claude" | "codex";

export interface Piece {
  agent: AgentId;
  sessionId: string;
  timestamp: number | null;
  prose: string;
}

export interface TicCount {
  id: string;
  label: string;
  kind: "curated" | "discovered";
  count: number;
  ratePerThousand: number;
  weight: number;
  sessions: number;
  lift: number | null;
  instead: string;
}

export interface ScoreBreakdown {
  value: number;
  band: string;
  gloss: string;
  combined: number;
  curatedComponent: number;
  discoveredComponent: number;
}

export interface PeriodStats {
  assistantWords: number;
  messages: number;
  score: ScoreBreakdown;
  tics: TicCount[];
}

export interface WarningItem {
  message: string;
  file?: string;
  line?: number;
}

export interface Report {
  version: string;
  sessions: number;
  filesScanned: number;
  messages: number;
  assistantWords: number;
  malformedLines: number;
  skippedFiles: number;
  agents: Record<AgentId, number>;
  dateStart: string | null;
  dateEnd: string | null;
  score: ScoreBreakdown;
  headline: string;
  top: TicCount[];
  curated: TicCount[];
  discovered: TicCount[];
  compare: null | {
    cutoff: string;
    undatedMessages: number;
    before: PeriodStats;
    after: PeriodStats;
  };
  warnings: WarningItem[];
  /** Scanned log paths. Stripped from output when --redact is on (the default). */
  files: string[];
}
