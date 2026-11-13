export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** Epoch milliseconds. Accepts ISO strings, epoch seconds, and epoch milliseconds. */
export function parseTime(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 1e12) return value;
    if (value > 1e9) return value * 1000;
    return null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return parseTime(Number(trimmed));
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Date-only values are UTC midnight. Anything else is parsed as an ISO timestamp. */
export function parseCutoff(input: string): number | null {
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = Date.parse(`${trimmed}T00:00:00.000Z`);
    return Number.isNaN(parsed) ? null : parsed;
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

export function formatDay(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

export function formatInt(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatRate(value: number): string {
  if (!Number.isFinite(value)) return "0.0";
  return value.toFixed(1);
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${formatInt(count)} ${count === 1 ? singular : pluralForm}`;
}

export function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function fit(value: string, width: number): string {
  const chars = [...value];
  if (chars.length <= width) return chars.join("");
  if (width <= 1) return chars.slice(0, width).join("");
  return `${chars.slice(0, width - 1).join("")}…`;
}

export function padRight(value: string, width: number): string {
  const visible = [...value].length;
  if (visible >= width) return fit(value, width);
  return value + " ".repeat(width - visible);
}

export function padLeft(value: string, width: number): string {
  const visible = [...value].length;
  if (visible >= width) return fit(value, width);
  return " ".repeat(width - visible) + value;
}

export function countWords(prose: string): number {
  const matches = prose.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g);
  if (!matches) return 0;
  let count = 0;
  for (const word of matches) {
    if (/[A-Za-z]/.test(word)) count += 1;
  }
  return count;
}

export function normalizeApostrophes(text: string): string {
  return text.replaceAll("’", "'").replaceAll("‘", "'");
}

export function compactWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
