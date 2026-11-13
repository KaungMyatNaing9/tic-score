import { extractProse } from "../prose.js";
import type { Piece } from "../types.js";
import { asRecord, asString, compactWhitespace, parseTime } from "../util.js";

export interface ParseResult {
  pieces: Piece[];
  malformed: number;
  records: number;
  sessionId: string | null;
}

/**
 * Codex CLI rollout JSONL.
 *
 * Assistant prose comes from response_item messages with role "assistant"
 * (output_text / text blocks, or a legacy string body). Developer messages,
 * user messages, reasoning, function calls, and tool output are ignored.
 * event_msg agent_message and task_complete.last_agent_message are used only
 * when they are not a snapshot or prefix of a canonical assistant message.
 * Compacted history is ignored so a summary does not double-count the thread.
 */
export function parseCodex(content: string, sessionId: string): ParseResult {
  const lines = content.split(/\n/);
  const canonical: { prose: string; timestamp: number | null; norm: string }[] = [];
  const fallback: { text: string; timestamp: number | null }[] = [];
  let malformed = 0;
  let records = 0;
  let fileSession: string | null = null;

  for (const raw of lines) {
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
    records += 1;
    const timestamp = parseTime(record.timestamp);
    const type = asString(record.type) ?? "";
    const payload = asRecord(record.payload) ?? record;

    if (type === "session_meta") {
      const id = asString(payload.id);
      if (id) fileSession = id;
      continue;
    }
    if (type === "compacted" || type === "turn_context") continue;

    if (type === "event_msg") {
      const eventType = asString(payload.type);
      if (eventType === "agent_message") {
        const text = asString(payload.message) ?? asString(payload.text);
        if (text) fallback.push({ text, timestamp });
      } else if (eventType === "task_complete") {
        const text = asString(payload.last_agent_message);
        if (text) fallback.push({ text, timestamp });
      }
      continue;
    }

    if (type === "response_item" || (type === "" && asString(payload.type) === "message")) {
      const payloadType = asString(payload.type) ?? "";
      if (payloadType !== "message" && type === "response_item") continue;
      const role = asString(payload.role);
      if (role !== "assistant") continue;
      const text = messageText(payload.content, "assistant");
      if (!text.trim()) continue;
      const prose = extractProse(text).trim();
      if (!prose) continue;
      canonical.push({ prose, timestamp, norm: compactWhitespace(prose).toLowerCase() });
    }
  }

  const pieces: Piece[] = canonical.map((item) => ({
    agent: "codex",
    sessionId,
    timestamp: item.timestamp,
    prose: item.prose,
  }));

  for (const item of fallback) {
    const prose = extractProse(item.text).trim();
    if (!prose) continue;
    const norm = compactWhitespace(prose).toLowerCase();
    const duplicate = canonical.some((existing) => {
      if (!existing.norm || !norm) return false;
      return (
        existing.norm === norm || existing.norm.startsWith(norm) || norm.startsWith(existing.norm)
      );
    });
    if (duplicate) continue;
    const alreadyFallback = pieces.some((existing) => {
      const existingNorm = compactWhitespace(existing.prose).toLowerCase();
      return (
        existingNorm === norm || existingNorm.startsWith(norm) || norm.startsWith(existingNorm)
      );
    });
    if (alreadyFallback) continue;
    pieces.push({
      agent: "codex",
      sessionId,
      timestamp: item.timestamp,
      prose,
    });
  }

  return { pieces, malformed, records, sessionId: fileSession };
}

function messageText(content: unknown, role: "assistant" | "user"): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const wanted = new Set(role === "assistant" ? ["output_text", "text"] : ["input_text", "text"]);
  const parts: string[] = [];
  for (const block of content) {
    if (typeof block === "string") {
      parts.push(block);
      continue;
    }
    const record = asRecord(block);
    if (!record) continue;
    const type = asString(record.type);
    if (type && !wanted.has(type)) continue;
    const text = asString(record.text) ?? asString(record.content);
    if (text) parts.push(text);
  }
  return parts.join("\n\n");
}
