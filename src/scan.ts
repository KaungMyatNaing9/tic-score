import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { analyze } from "./analyze.js";
import { acceptsFile, defaultRoots, findLogFiles, type LogRoot } from "./discover.js";
import { type ParseResult, parseClaude } from "./parse/claude.js";
import { parseCodex } from "./parse/codex.js";
import { detectFormat } from "./parse/detect.js";
import type { AgentId, Piece, Report, WarningItem } from "./types.js";
import { parseCutoff } from "./util.js";

export interface ScanOptions {
  paths: string[];
  home: string;
  env: NodeJS.ProcessEnv;
  agent: "auto" | AgentId;
  compare: string | null;
  top: number;
  redact: boolean;
}

export class ScanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScanError";
  }
}

export async function scanLogs(options: ScanOptions): Promise<Report> {
  const cutoff = options.compare ? parseCutoff(options.compare) : null;
  if (options.compare && cutoff === null) {
    throw new ScanError(`Could not parse --compare date "${options.compare}". Use YYYY-MM-DD.`);
  }

  const located = await locateFiles(options.paths, options.home, options.env);
  if (located.files.length === 0) {
    const looked = located.looked.join(", ");
    throw new ScanError(
      `No session logs found. Looked in ${looked}. Pass --path with a Claude Code project directory, a Codex sessions directory, or a folder of .jsonl files.`,
    );
  }

  const pieces: Piece[] = [];
  const warnings: WarningItem[] = [];
  const files: string[] = [];
  let malformedLines = 0;
  let sessions = 0;
  const agents: Record<AgentId, number> = { claude: 0, codex: 0 };

  for (const file of located.files) {
    let content: string;
    try {
      content = await readFile(file, "utf8");
    } catch {
      warnings.push({ message: "unreadable file", file });
      continue;
    }
    files.push(file);
    const detected = options.agent === "auto" ? detectFormat(content) : options.agent;
    const sessionId = path.basename(file);
    const parsed = parseFile(content, sessionId, detected);
    malformedLines += parsed.result.malformed;
    if (parsed.result.malformed > 0) {
      warnings.push({
        message: `skipped ${parsed.result.malformed} malformed line${parsed.result.malformed === 1 ? "" : "s"}`,
        file,
      });
    }
    if (parsed.result.records > 0 || parsed.result.pieces.length > 0) {
      sessions += 1;
      agents[parsed.agent] += 1;
    }
    pieces.push(...parsed.result.pieces);
  }

  const analysis = analyze(pieces, {
    compareCutoff: cutoff,
    top: options.top,
    sessions,
  });

  return {
    ...analysis,
    sessions,
    filesScanned: files.length,
    malformedLines,
    skippedFiles: located.skipped.length,
    agents,
    warnings: options.redact
      ? summarizeWarnings(warnings, malformedLines, located.skipped.length)
      : [
          ...warnings,
          ...(located.skipped.length > 0
            ? [
                {
                  message: `skipped ${located.skipped.length} index or prompt-suggestion file${located.skipped.length === 1 ? "" : "s"}`,
                },
              ]
            : []),
        ],
    files: options.redact ? [] : files,
  };
}

function summarizeWarnings(
  warnings: WarningItem[],
  malformedLines: number,
  skipped: number,
): WarningItem[] {
  const summary: WarningItem[] = [];
  if (malformedLines > 0) {
    summary.push({
      message: `skipped ${malformedLines} malformed line${malformedLines === 1 ? "" : "s"}`,
    });
  }
  if (skipped > 0) {
    summary.push({
      message: `skipped ${skipped} index or prompt-suggestion file${skipped === 1 ? "" : "s"}`,
    });
  }
  const unreadable = warnings.filter((warning) => warning.message === "unreadable file").length;
  if (unreadable > 0) {
    summary.push({
      message: `skipped ${unreadable} unreadable file${unreadable === 1 ? "" : "s"}`,
    });
  }
  return summary;
}

async function locateFiles(
  paths: readonly string[],
  home: string,
  env: NodeJS.ProcessEnv,
): Promise<{ files: string[]; skipped: string[]; looked: string[] }> {
  if (paths.length === 0) {
    const roots = defaultRoots(home, env);
    const found = await findLogFiles(roots);
    return {
      files: found.files,
      skipped: found.skipped,
      looked: roots.map((root) => root.dir),
    };
  }

  const files: string[] = [];
  const skipped: string[] = [];
  const looked: string[] = [];
  const directories: LogRoot[] = [];

  for (const input of paths) {
    const resolved = path.resolve(input);
    looked.push(resolved);
    let info: Awaited<ReturnType<typeof stat>>;
    try {
      info = await stat(resolved);
    } catch {
      throw new ScanError(`Path not found: ${input}`);
    }
    if (info.isFile()) {
      if (acceptsFile(resolved, "custom")) files.push(resolved);
      else skipped.push(resolved);
      continue;
    }
    if (!info.isDirectory()) {
      throw new ScanError(`Path is not a file or directory: ${input}`);
    }
    directories.push({ dir: resolved, kind: "custom" });
  }

  if (directories.length > 0) {
    const found = await findLogFiles(directories);
    files.push(...found.files);
    skipped.push(...found.skipped);
  }
  files.sort();
  return { files, skipped, looked };
}

function parseFile(
  content: string,
  sessionId: string,
  format: "claude" | "codex" | "unknown",
): { result: ParseResult; agent: AgentId } {
  if (format === "codex") return { result: parseCodex(content, sessionId), agent: "codex" };
  if (format === "claude") return { result: parseClaude(content, sessionId), agent: "claude" };
  const claude = parseClaude(content, sessionId);
  const codex = parseCodex(content, sessionId);
  if (codex.pieces.length > claude.pieces.length) return { result: codex, agent: "codex" };
  if (claude.pieces.length > 0 || claude.records >= codex.records) {
    return { result: claude, agent: "claude" };
  }
  return { result: codex, agent: "codex" };
}
