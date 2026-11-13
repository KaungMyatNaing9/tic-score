import {
  curatedComponent,
  DISCOVERED_IN_SCORE,
  DISCOVERED_WEIGHT,
  discoveredComponent,
  ratePerThousand,
  scoreFromComponents,
} from "./formula.js";
import {
  collectGrams,
  type DiscoveredPhrase,
  type GramStat,
  mergeSession,
  selectDiscoveries,
  tokenize,
} from "./ngrams.js";
import { countTicHits, maskTics, TICS, ticById } from "./tics.js";
import type { PeriodStats, Piece, ScoreBreakdown, TicCount } from "./types.js";
import { countWords, plural, round2 } from "./util.js";
import { VERSION } from "./version.js";

export interface AnalyzeOptions {
  compareCutoff?: number | null;
  top?: number;
  /** Session files scanned. The headline uses this, not only sessions that had prose. */
  sessions?: number;
}

interface Bucket {
  words: number;
  messages: number;
  curated: Map<string, number>;
  curatedSessions: Map<string, Set<string>>;
  grams: Map<string, GramStat>;
  gramCounts: Map<string, number>;
}

function emptyBucket(): Bucket {
  return {
    words: 0,
    messages: 0,
    curated: new Map(),
    curatedSessions: new Map(),
    grams: new Map(),
    gramCounts: new Map(),
  };
}

function addCounts(target: Map<string, number>, extra: Map<string, number>): void {
  for (const [id, count] of extra) {
    target.set(id, (target.get(id) ?? 0) + count);
  }
}

export interface AnalysisCore {
  version: string;
  messages: number;
  assistantWords: number;
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
}

export function analyze(pieces: readonly Piece[], options: AnalyzeOptions = {}): AnalysisCore {
  const topN = options.top ?? 5;
  const cutoff = options.compareCutoff ?? null;
  const all = emptyBucket();
  const before = emptyBucket();
  const after = emptyBucket();
  let undated = 0;
  let minTime: number | null = null;
  let maxTime: number | null = null;
  const sessionGrams = new Map<string, Map<string, number>>();

  for (const piece of pieces) {
    const prose = piece.prose;
    const words = countWords(prose);
    if (words === 0 && prose.trim() === "") continue;
    all.words += words;
    all.messages += 1;
    const curated = countTicHits(prose);
    addCounts(all.curated, curated);
    for (const [id, count] of curated) {
      if (count <= 0) continue;
      let sessions = all.curatedSessions.get(id);
      if (!sessions) {
        sessions = new Set();
        all.curatedSessions.set(id, sessions);
      }
      sessions.add(piece.sessionId);
    }
    const local = sessionGrams.get(piece.sessionId) ?? new Map<string, number>();
    const grams = collectGrams(tokenize(maskTics(prose)));
    for (const [phrase, count] of grams) {
      local.set(phrase, (local.get(phrase) ?? 0) + count);
    }
    sessionGrams.set(piece.sessionId, local);

    if (piece.timestamp !== null) {
      if (minTime === null || piece.timestamp < minTime) minTime = piece.timestamp;
      if (maxTime === null || piece.timestamp > maxTime) maxTime = piece.timestamp;
    }

    if (cutoff !== null) {
      if (piece.timestamp === null) {
        undated += 1;
      } else {
        const bucket = piece.timestamp < cutoff ? before : after;
        bucket.words += words;
        bucket.messages += 1;
        addCounts(bucket.curated, curated);
        for (const [phrase, count] of grams) {
          bucket.gramCounts.set(phrase, (bucket.gramCounts.get(phrase) ?? 0) + count);
        }
      }
    }
  }

  for (const local of sessionGrams.values()) mergeSession(all.grams, local);

  const sessionCount = sessionGrams.size;
  const discovered = selectDiscoveries(all.grams, all.words, Math.max(sessionCount, 1));
  const curated = curatedCounts(all, all.words);
  const discoveredCounts = discovered.map((phrase) => toDiscoveredCount(phrase));
  const score = scoreFromComponents(
    curatedComponent(curated),
    discoveredComponent(discoveredCounts),
  );
  const top = topTics(curated, discoveredCounts, topN);
  const headline = buildHeadline(top, options.sessions ?? sessionCount);

  let compare: AnalysisCore["compare"] = null;
  if (cutoff !== null) {
    const beforeStats = periodStats(before, discovered);
    const afterStats = periodStats(after, discovered);
    compare = {
      cutoff: new Date(cutoff).toISOString(),
      undatedMessages: undated,
      before: beforeStats,
      after: afterStats,
    };
  }

  return {
    version: VERSION,
    messages: all.messages,
    assistantWords: all.words,
    dateStart: minTime === null ? null : new Date(minTime).toISOString().slice(0, 10),
    dateEnd: maxTime === null ? null : new Date(maxTime).toISOString().slice(0, 10),
    score: {
      ...score,
      combined: round2(score.combined),
      curatedComponent: round2(score.curatedComponent),
      discoveredComponent: round2(score.discoveredComponent),
    },
    headline,
    top,
    curated: curated.filter((tic) => tic.count > 0),
    discovered: discoveredCounts,
    compare,
  };
}

function curatedCounts(bucket: Bucket, words: number): TicCount[] {
  const rows: TicCount[] = [];
  for (const tic of TICS) {
    const count = bucket.curated.get(tic.id) ?? 0;
    rows.push({
      id: tic.id,
      label: tic.label,
      kind: "curated",
      count,
      ratePerThousand: ratePerThousand(count, words),
      weight: tic.weight,
      sessions: bucket.curatedSessions.get(tic.id)?.size ?? 0,
      lift: null,
      instead: tic.instead,
    });
  }
  rows.sort(
    (a, b) =>
      contribution(b) - contribution(a) || b.count - a.count || a.label.localeCompare(b.label),
  );
  return rows;
}

function toDiscoveredCount(phrase: DiscoveredPhrase): TicCount {
  return {
    id: `discovered:${phrase.phrase}`,
    label: phrase.phrase,
    kind: "discovered",
    count: phrase.count,
    ratePerThousand: phrase.ratePerThousand,
    weight: DISCOVERED_WEIGHT,
    sessions: phrase.sessions,
    lift: phrase.lift,
    instead: `Cut "${phrase.phrase}", or replace it with a concrete noun.`,
  };
}

export function contribution(tic: TicCount): number {
  if (tic.kind === "discovered") {
    return Math.min(tic.ratePerThousand, 15) * DISCOVERED_WEIGHT;
  }
  return tic.ratePerThousand * tic.weight;
}

function topTics(
  curated: readonly TicCount[],
  discovered: readonly TicCount[],
  topN: number,
): TicCount[] {
  const pool = [...curated.filter((tic) => tic.count > 0), ...discovered];
  pool.sort(
    (a, b) =>
      contribution(b) - contribution(a) || b.count - a.count || a.label.localeCompare(b.label),
  );
  return pool.slice(0, topN);
}

export function buildHeadline(top: readonly TicCount[], sessions: number): string {
  const phrase =
    top.find((tic) => tic.id !== "em-dash" && tic.count > 0) ?? top.find((tic) => tic.count > 0);
  const sessionText = plural(sessions, "session");
  if (!phrase) {
    return `No repeated tics in the assistant text across ${sessionText}.`;
  }
  const times = plural(phrase.count, "time");
  if (phrase.id === "em-dash") {
    return `Your agent used an em dash ${times} across ${sessionText}.`;
  }
  return `Your agent said "${phrase.label}" ${times} across ${sessionText}.`;
}

function periodStats(bucket: Bucket, discovered: readonly DiscoveredPhrase[]): PeriodStats {
  const curated = curatedCounts(bucket, bucket.words).filter((tic) => tic.count > 0);
  const discoveredCounts = discovered.slice(0, DISCOVERED_IN_SCORE).map((phrase) => {
    const count = bucket.gramCounts.get(phrase.phrase) ?? 0;
    const rate = ratePerThousand(count, bucket.words);
    return {
      ...toDiscoveredCount(phrase),
      count,
      ratePerThousand: rate,
      sessions: 0,
      lift: null,
    } satisfies TicCount;
  });
  const visible = discoveredCounts.filter((tic) => tic.count > 0);
  const score = scoreFromComponents(curatedComponent(curated), discoveredComponent(visible));
  return {
    assistantWords: bucket.words,
    messages: bucket.messages,
    score: {
      ...score,
      combined: round2(score.combined),
      curatedComponent: round2(score.curatedComponent),
      discoveredComponent: round2(score.discoveredComponent),
    },
    tics: [...curated, ...discoveredCounts],
  };
}

export function ticLabel(id: string): string {
  return ticById(id)?.label ?? id;
}
