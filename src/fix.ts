import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Report } from "./types.js";
import { formatInt, formatRate, plural } from "./util.js";

export const START = "<!-- tic-score:start -->";
export const END = "<!-- tic-score:end -->";

export type TargetKind = "claude" | "agents" | "skill";

export interface Destination {
  kind: TargetKind;
  file: string;
  scope: "project" | "global";
}

export function renderFixBody(report: Report): string {
  const lines: string[] = [];
  lines.push("## Verbal tics to drop");
  lines.push("");
  lines.push(
    "Measured locally by tic-score from assistant prose only. Tool output, code blocks, and quoted file dumps were not counted. Do not use these phrases in replies, commit messages, or user-facing prose.",
  );
  lines.push("");
  lines.push(
    `Score ${report.score.value} (${report.score.band}) across ${plural(report.sessions, "session")} and ${formatInt(report.assistantWords)} assistant words.`,
  );
  lines.push("");
  if (report.top.length === 0) {
    lines.push("No repeated tics cleared the bar in this scan. Leave the voice alone.");
    lines.push("");
    return lines.join("\n");
  }
  for (const tic of report.top) {
    const found =
      tic.kind === "discovered"
        ? " Found by comparing this log with ordinary English, not taken from the built-in list."
        : "";
    lines.push(
      `- "${tic.label}" (${plural(tic.count, "time")}, ${formatRate(tic.ratePerThousand)} per 1,000 words). ${tic.instead}${found}`,
    );
  }
  lines.push("");
  lines.push(
    "If a banned phrase is the accurate technical term, replace it with a concrete noun instead of a softer synonym.",
  );
  lines.push("Do not quote this list back as a preamble.");
  lines.push("");
  return lines.join("\n");
}

export function destinations(
  cwd: string,
  home: string,
  targets: readonly TargetKind[],
  globalScope: boolean,
): Destination[] {
  const list: Destination[] = [];
  if (targets.includes("claude")) {
    list.push({ kind: "claude", file: path.join(cwd, "CLAUDE.md"), scope: "project" });
    if (globalScope) {
      list.push({
        kind: "claude",
        file: path.join(home, ".claude", "CLAUDE.md"),
        scope: "global",
      });
    }
  }
  if (targets.includes("agents")) {
    list.push({ kind: "agents", file: path.join(cwd, "AGENTS.md"), scope: "project" });
    if (globalScope) {
      list.push({
        kind: "agents",
        file: path.join(home, ".codex", "AGENTS.md"),
        scope: "global",
      });
    }
  }
  if (targets.includes("skill")) {
    list.push({
      kind: "skill",
      file: path.join(cwd, ".claude", "skills", "tic-score", "SKILL.md"),
      scope: "project",
    });
    if (globalScope) {
      list.push({
        kind: "skill",
        file: path.join(home, ".claude", "skills", "tic-score", "SKILL.md"),
        scope: "global",
      });
    }
  }
  return list;
}

export function upsertSection(existing: string | null, body: string, kind: TargetKind): string {
  const block = `${START}\n${body}${END}\n`;
  if (existing?.includes(START) && existing.includes(END)) {
    return existing.replace(/<!-- tic-score:start -->[\s\S]*?<!-- tic-score:end -->\n?/, block);
  }
  if (kind === "skill") {
    const front = existing?.trim()
      ? `${existing.trim()}\n\n`
      : "---\nname: tic-score\ndescription: Drop the verbal tics measured in this user's local agent logs. Apply when writing prose, commit messages, or replies.\n---\n\n";
    return `${front}${block}`;
  }
  if (!existing || existing.trim() === "") {
    return `# Agent instructions\n\n${block}`;
  }
  const base = existing.endsWith("\n") ? existing : `${existing}\n`;
  return `${base}\n${block}`;
}

export async function writeDestinations(
  places: readonly Destination[],
  body: string,
): Promise<string[]> {
  const written: string[] = [];
  for (const place of places) {
    let existing: string | null = null;
    try {
      existing = await readFile(place.file, "utf8");
    } catch {
      existing = null;
    }
    const next = upsertSection(existing, body, place.kind);
    await mkdir(path.dirname(place.file), { recursive: true });
    await writeFile(place.file, next.endsWith("\n") ? next : `${next}\n`, "utf8");
    written.push(place.file);
  }
  return written;
}

export function whereToPut(places: readonly Destination[], written: boolean): string {
  const lines = [
    written
      ? "Updated the tic-score section in:"
      : "Nothing was written. Put this snippet in one of:",
  ];
  for (const place of places) {
    lines.push(`  ${place.file}  (${place.scope} ${place.kind})`);
  }
  if (!written) {
    lines.push("");
    lines.push(
      "Re-run with --write to update those files. --write --global also updates the home copies.",
    );
  }
  return lines.join("\n");
}
