import { baselinePerThousand, unigramKnown } from "./baseline.js";
import { normalizeApostrophes } from "./util.js";

/**
 * Finds phrases the catalog does not list.
 *
 * Tokens are lowercase words, keeping internal hyphens and apostrophes so
 * "load-bearing" stays one token. Curated matches are masked before counting.
 *
 * A candidate has to clear all of these:
 * - not only stopwords, and at least one content word of 4+ letters
 * - not entirely programming vocabulary (so "pull request" is not a tic)
 * - unigrams are hyphenated, out of the English baseline, or a long -ly adverb
 * - trigrams contain a rare or hyphenated content word (ordinary trigrams are too easy)
 * - minimum count, minimum sessions, and not concentrated in a single session
 * - lift of at least 8× against the English baseline
 *
 * With one session, discovery is noisier: a topic phrase can pass. The card
 * is more trustworthy once several sessions agree.
 */

export const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "then",
  "else",
  "so",
  "because",
  "as",
  "of",
  "at",
  "by",
  "for",
  "with",
  "about",
  "into",
  "onto",
  "over",
  "under",
  "from",
  "to",
  "in",
  "on",
  "out",
  "up",
  "down",
  "off",
  "than",
  "that",
  "this",
  "these",
  "those",
  "it",
  "its",
  "it's",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "your",
  "you're",
  "he",
  "she",
  "they",
  "them",
  "their",
  "his",
  "her",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "am",
  "do",
  "does",
  "did",
  "doing",
  "have",
  "has",
  "had",
  "having",
  "not",
  "no",
  "nor",
  "yes",
  "just",
  "also",
  "very",
  "too",
  "can",
  "could",
  "should",
  "would",
  "will",
  "won't",
  "shall",
  "may",
  "might",
  "must",
  "there",
  "here",
  "when",
  "where",
  "what",
  "which",
  "who",
  "whom",
  "whose",
  "why",
  "how",
  "all",
  "any",
  "some",
  "each",
  "few",
  "more",
  "most",
  "other",
  "such",
  "only",
  "own",
  "same",
  "both",
  "between",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "again",
  "once",
  "while",
  "of",
  "per",
  "via",
  "without",
  "within",
  "across",
  "around",
  "like",
  "near",
  "beside",
  "upon",
  "toward",
  "towards",
  "against",
  "among",
  "amongst",
  "along",
  "inside",
  "outside",
  "despite",
]);

/** Topic words that dominate coding logs and are not verbal tics. */
export const TECHNICAL = new Set([
  "function",
  "const",
  "return",
  "import",
  "class",
  "method",
  "file",
  "files",
  "error",
  "errors",
  "test",
  "tests",
  "code",
  "type",
  "types",
  "string",
  "value",
  "values",
  "api",
  "server",
  "client",
  "data",
  "config",
  "component",
  "parser",
  "index",
  "cache",
  "branch",
  "session",
  "sessions",
  "token",
  "tokens",
  "prompt",
  "model",
  "json",
  "null",
  "true",
  "false",
  "async",
  "await",
  "export",
  "default",
  "interface",
  "object",
  "array",
  "number",
  "boolean",
  "undefined",
  "console",
  "commit",
  "repo",
  "pull",
  "request",
  "diff",
  "patch",
  "lint",
  "build",
  "spec",
  "fixture",
  "variable",
  "parameter",
  "argument",
  "callback",
  "promise",
  "module",
  "package",
  "dependency",
  "runtime",
  "compile",
  "syntax",
  "schema",
  "field",
  "record",
  "message",
  "content",
  "block",
  "output",
  "input",
  "command",
  "shell",
  "script",
  "path",
  "directory",
  "folder",
  "line",
  "lines",
  "bug",
  "issue",
  "user",
  "agent",
  "assistant",
  "claude",
  "codex",
  "openai",
  "anthropic",
  "typescript",
  "javascript",
  "python",
  "rust",
  "html",
  "css",
  "http",
  "https",
  "url",
  "jsonl",
  "readme",
  "todo",
  "loop",
  "query",
  "table",
  "column",
  "row",
  "rows",
  "database",
  "regex",
  "pattern",
  "match",
  "group",
  "flag",
  "option",
  "cli",
  "stdin",
  "stdout",
  "stderr",
  "buffer",
  "stream",
  "chunk",
  "byte",
  "bytes",
  "hash",
  "uuid",
  "timestamp",
  "payload",
  "header",
  "status",
  "exception",
  "stack",
  "trace",
  "debug",
  "pointer",
  "memory",
  "thread",
  "process",
  "socket",
  "port",
  "host",
  "offset",
  "retry",
  "wrapper",
  "filename",
  "helper",
  "counter",
  "generation",
  "comment",
  "comments",
  "snapshot",
  "header",
  "bounds",
  "lookup",
  "rebuild",
  "rewind",
  "scheduler",
  "newline",
  "brass",
]);

const MIN_COUNT: Record<number, number> = { 1: 6, 2: 4, 3: 4 };
const LIFT_MIN = 8;
const RATE_MIN = 0.2;

export interface GramStat {
  count: number;
  sessions: number;
  maxInOne: number;
}

export interface DiscoveredPhrase {
  phrase: string;
  count: number;
  sessions: number;
  ratePerThousand: number;
  lift: number;
  rank: number;
}

export function tokenize(text: string): string[] {
  const normalized = normalizeApostrophes(text).toLowerCase();
  const matches = normalized.match(/[a-z0-9]+(?:['-][a-z0-9]+)*/g);
  if (!matches) return [];
  return matches.filter((token) => /[a-z]/.test(token) && !/\d/.test(token));
}

export function minSessions(totalSessions: number): number {
  if (totalSessions <= 1) return 1;
  if (totalSessions === 2) return 2;
  return Math.min(3, totalSessions);
}

function contentWords(tokens: readonly string[]): string[] {
  return tokens.filter(
    (token) => !STOPWORDS.has(token) && (token.length >= 4 || token.includes("-")),
  );
}

function unigramShape(token: string): boolean {
  if (token.includes("-") && /[a-z]/.test(token)) return true;
  if (!unigramKnown(token) && token.length >= 5) return true;
  if (token.endsWith("ly") && token.length >= 8) return true;
  return false;
}

function eligible(tokens: readonly string[]): boolean {
  const content = contentWords(tokens);
  if (content.length === 0) return false;
  if (content.every((word) => TECHNICAL.has(word))) return false;
  if (tokens.length === 1) return unigramShape(tokens[0] ?? "");
  // "the small" is a function word plus a topic word, not a phrase tic.
  if (content.length < 2) return false;
  if (tokens.length === 3) {
    return content.some((word) => word.includes("-") || !unigramKnown(word));
  }
  return true;
}

export function collectGrams(tokens: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (let size = 1; size <= 3; size += 1) {
    for (let index = 0; index + size <= tokens.length; index += 1) {
      const slice = tokens.slice(index, index + size);
      if (!eligible(slice)) continue;
      const key = slice.join(" ");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

export function mergeSession(
  global: Map<string, GramStat>,
  local: Map<string, number>,
  cap = 200_000,
): void {
  for (const [phrase, count] of local) {
    if (count <= 0) continue;
    let stat = global.get(phrase);
    if (!stat) {
      if (global.size >= cap) continue;
      stat = { count: 0, sessions: 0, maxInOne: 0 };
      global.set(phrase, stat);
    }
    stat.count += count;
    stat.sessions += 1;
    if (count > stat.maxInOne) stat.maxInOne = count;
  }
}

function similar(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(2, 0.25 * Math.max(a, b));
}

function contentSet(phrase: string): string[] {
  return contentWords(phrase.split(" "));
}

export function selectDiscoveries(
  stats: Map<string, GramStat>,
  assistantWords: number,
  totalSessions: number,
  limit = 8,
): DiscoveredPhrase[] {
  const sessionsNeeded = minSessions(totalSessions);
  const ranked: DiscoveredPhrase[] = [];
  for (const [phrase, stat] of stats) {
    const size = phrase.split(" ").length;
    const minCount = MIN_COUNT[size] ?? 4;
    if (stat.count < minCount) continue;
    if (stat.sessions < sessionsNeeded) continue;
    if (totalSessions >= 3 && stat.maxInOne / stat.count > 0.8) continue;
    const rate = assistantWords > 0 ? (stat.count / assistantWords) * 1000 : 0;
    if (rate < RATE_MIN) continue;
    const baseline = baselinePerThousand(phrase);
    const lift = baseline > 0 ? rate / baseline : 0;
    if (lift < LIFT_MIN) continue;
    const spread = totalSessions > 0 ? stat.sessions / totalSessions : 0;
    const rank = lift * Math.log(stat.count + 1) * (0.5 + spread);
    ranked.push({
      phrase,
      count: stat.count,
      sessions: stat.sessions,
      ratePerThousand: rate,
      lift,
      rank,
    });
  }
  ranked.sort((a, b) => b.rank - a.rank || a.phrase.localeCompare(b.phrase));
  return collapseOverlaps(ranked).slice(0, limit);
}

/**
 * "quark" and "latch" are the same habit as "quark latch" when the counts match.
 * Keep the phrase with more content words, and the shorter wording when the
 * extra tokens are only stopwords ("the quark latch" loses to "quark latch").
 */
function collapseOverlaps(ranked: readonly DiscoveredPhrase[]): DiscoveredPhrase[] {
  const ordered = [...ranked].sort(
    (a, b) =>
      contentSet(b.phrase).length - contentSet(a.phrase).length ||
      a.phrase.split(" ").length - b.phrase.split(" ").length ||
      b.rank - a.rank,
  );
  const kept: DiscoveredPhrase[] = [];
  for (const candidate of ordered) {
    const content = contentSet(candidate.phrase);
    const covered = kept.some((current) => {
      if (!similar(current.count, candidate.count)) return false;
      const other = contentSet(current.phrase);
      return content.every((word) => other.includes(word));
    });
    if (!covered) kept.push(candidate);
  }
  kept.sort((a, b) => b.rank - a.rank || a.phrase.localeCompare(b.phrase));
  return kept;
}
