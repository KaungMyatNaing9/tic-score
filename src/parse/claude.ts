import { extractProse } from "../prose.js";
import type { Piece } from "../types.js";
import { asRecord, asString, compactWhitespace, parseTime } from "../util.js";

export interface ParseResult {
  pieces: Piece[];
  malformed: number;
  records: number;
  sessionId: string | null;
}

interface ClaudeRec {
  index: number;
  uuid: string | null;
  parentUuid: string | null;
  timestamp: number | null;
  messageId: string | null;
  texts: string[];
  skip: boolean;
}

/**
 * Claude Code JSONL.
 *
 * Counts assistant text blocks only. Thinking, tool_use, and tool results
 * (stored on user records) are dropped. Records linked by parentUuid are
 * reduced to the latest leaf's ancestry so a rewound branch is not counted
 * twice. Streamed lines that share a message id are merged: a later line that
 * extends an earlier one is a snapshot, and a line that does not is a new block.
 *
 * See docs/LOG_FORMATS.md for what was verified against public field notes
 * versus what this parser accepts defensively.
 */
export function parseClaude(content: string, sessionId: string): ParseResult {
  const lines = content.split(/\n/);
  const records: ClaudeRec[] = [];
  let malformed = 0;
  let fileSession: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? "";
    const line = raw.replace(/^\uFEFF/, "").trim();
    if (!line) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      malformed += 1;
      continue;
    }
    const record = asRecord(parsed);
    if (!record) {
      malformed += 1;
      continue;
    }
    const session = asString(record.sessionId) ?? asString(record.session_id);
    if (session && !fileSession) fileSession = session;
    if (record.isApiErrorMessage === true) continue;
    const type = asString(record.type) ?? "";
    if (type !== "assistant") {
      records.push({
        index,
        uuid: asString(record.uuid),
        parentUuid: asString(record.parentUuid) ?? asString(record.parent_uuid),
        timestamp: parseTime(record.timestamp),
        messageId: null,
        texts: [],
        skip: true,
      });
      continue;
    }
    const message = asRecord(record.message);
    const extracted = message ? assistantTexts(message) : { id: null, texts: [] };
    records.push({
      index,
      uuid: asString(record.uuid),
      parentUuid: asString(record.parentUuid) ?? asString(record.parent_uuid),
      timestamp: parseTime(record.timestamp),
      messageId: extracted.id ?? asString(record.requestId),
      texts: extracted.texts,
      skip: false,
    });
  }

  const active = selectActivePath(records);
  const pieces = piecesFromPath(active, sessionId);
  const known = records.some((record) => record.uuid || !record.skip || record.texts.length > 0);
  return {
    pieces,
    malformed,
    records: known ? records.length : 0,
    sessionId: fileSession,
  };
}

function assistantTexts(message: Record<string, unknown>): { id: string | null; texts: string[] } {
  const id = asString(message.id);
  const content = message.content;
  if (typeof content === "string") return { id, texts: [content] };
  if (!Array.isArray(content)) return { id, texts: [] };
  const texts: string[] = [];
  for (const block of content) {
    if (typeof block === "string") {
      texts.push(block);
      continue;
    }
    const record = asRecord(block);
    if (!record) continue;
    const type = asString(record.type);
    if (type !== "text" && type !== null) continue;
    const text = asString(record.text) ?? (type === "text" ? asString(record.content) : null);
    if (text) texts.push(text);
  }
  return { id, texts };
}

function selectActivePath(records: readonly ClaudeRec[]): ClaudeRec[] {
  const linked = records.some((record) => record.parentUuid);
  const withUuid = records.filter((record) => record.uuid);
  if (!linked || withUuid.length < 2) {
    return records.filter((record) => !record.skip && record.texts.length > 0);
  }

  const byUuid = new Map<string, ClaudeRec>();
  for (const record of records) {
    if (record.uuid && !byUuid.has(record.uuid)) byUuid.set(record.uuid, record);
  }
  const parents = new Set<string>();
  for (const record of records) {
    if (record.parentUuid) parents.add(record.parentUuid);
  }
  const leaves = records.filter((record) => record.uuid && !parents.has(record.uuid));
  if (leaves.length === 0) {
    return records.filter((record) => !record.skip && record.texts.length > 0);
  }
  leaves.sort((a, b) => {
    const at = a.timestamp ?? Number.NEGATIVE_INFINITY;
    const bt = b.timestamp ?? Number.NEGATIVE_INFINITY;
    if (at !== bt) return bt - at;
    return b.index - a.index;
  });
  const leaf = leaves[0];
  if (!leaf) return [];

  const path: ClaudeRec[] = [];
  const seen = new Set<string>();
  let current: ClaudeRec | undefined = leaf;
  while (current?.uuid && !seen.has(current.uuid)) {
    seen.add(current.uuid);
    path.push(current);
    current = current.parentUuid ? byUuid.get(current.parentUuid) : undefined;
  }
  path.reverse();

  const orphanTexts = records.filter(
    (record) => !record.skip && record.texts.length > 0 && !record.uuid,
  );
  return [...path, ...orphanTexts];
}

function piecesFromPath(records: readonly ClaudeRec[], sessionId: string): Piece[] {
  const groups: { id: string | null; parts: string[]; timestamp: number | null }[] = [];
  for (const record of records) {
    if (record.skip || record.texts.length === 0) continue;
    const part = record.texts
      .map((text) => text.trim())
      .filter(Boolean)
      .join("\n\n");
    if (!part) continue;
    const previous = groups[groups.length - 1];
    if (record.messageId && previous && previous.id === record.messageId) {
      previous.parts.push(part);
      if (previous.timestamp === null) previous.timestamp = record.timestamp;
      continue;
    }
    groups.push({ id: record.messageId, parts: [part], timestamp: record.timestamp });
  }

  const pieces: Piece[] = [];
  for (const group of groups) {
    const merged = mergeSnapshots(group.parts);
    const prose = extractProse(merged).trim();
    if (!prose) continue;
    pieces.push({
      agent: "claude",
      sessionId,
      timestamp: group.timestamp,
      prose,
    });
  }
  return pieces;
}

export function mergeSnapshots(parts: readonly string[]): string {
  let acc = "";
  for (const part of parts) {
    const next = part.trim();
    if (!next) continue;
    if (!acc) {
      acc = part;
      continue;
    }
    const current = compactWhitespace(acc);
    const incoming = compactWhitespace(part);
    if (incoming === current || current.startsWith(incoming)) continue;
    if (incoming.startsWith(current)) {
      acc = part;
      continue;
    }
    acc = `${acc}\n\n${part}`;
  }
  return acc;
}
