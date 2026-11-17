import { asRecord, asString } from "../util.js";

export type LogFormat = "claude" | "codex" | "unknown";

/** Peek at the first records and decide which parser understands the file. */
export function detectFormat(sample: string): LogFormat {
  let claude = 0;
  let codex = 0;
  let seen = 0;
  for (const raw of sample.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    seen += 1;
    if (seen > 40) break;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    const record = asRecord(parsed);
    if (!record) continue;
    const type = asString(record.type) ?? "";
    if (
      type === "session_meta" ||
      type === "response_item" ||
      type === "event_msg" ||
      type === "turn_context" ||
      type === "compacted"
    ) {
      codex += 2;
    }
    if (
      type === "assistant" ||
      type === "user" ||
      type === "summary" ||
      type === "file-history-snapshot" ||
      type === "progress" ||
      type === "attachment"
    ) {
      claude += 2;
    }
    if (asRecord(record.payload)) codex += 1;
    const message = asRecord(record.message);
    if (message && (message.role === "assistant" || message.role === "user")) claude += 1;
  }
  if (claude === 0 && codex === 0) return "unknown";
  return codex > claude ? "codex" : "claude";
}
