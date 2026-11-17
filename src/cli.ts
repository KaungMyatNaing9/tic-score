#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ArgError, HELP, parseArgs } from "./args.js";
import { renderPng } from "./card/png.js";
import { renderSvg } from "./card/svg.js";
import { renderTerminal } from "./card/terminal.js";
import { destinations, renderFixBody, whereToPut, writeDestinations } from "./fix.js";
import { FORMULA_LINE } from "./formula.js";
import { ScanError, scanLogs } from "./scan.js";
import type { Report } from "./types.js";
import { round2 } from "./util.js";
import { VERSION } from "./version.js";

export interface Io {
  stdout: { write(chunk: string): void };
  stderr: { write(chunk: string): void };
  cwd: string;
  env: NodeJS.ProcessEnv;
  home: string;
  isTTY: boolean;
}

export function defaultIo(): Io {
  return {
    stdout: process.stdout,
    stderr: process.stderr,
    cwd: process.cwd(),
    env: process.env,
    home: homedir(),
    isTTY: Boolean(process.stdout.isTTY),
  };
}

export async function run(argv: readonly string[], io: Io = defaultIo()): Promise<number> {
  let args: ReturnType<typeof parseArgs>;
  try {
    args = parseArgs(argv);
  } catch (error) {
    const message = error instanceof ArgError ? error.message : "Could not read arguments.";
    io.stderr.write(`${message}\n\n${HELP}`);
    return 2;
  }

  if (args.command === "help") {
    io.stdout.write(HELP);
    return 0;
  }
  if (args.command === "version") {
    io.stdout.write(`${VERSION}\n`);
    return 0;
  }

  let report: Report;
  try {
    report = await scanLogs({
      paths: args.paths,
      home: io.home,
      env: io.env,
      agent: args.agent,
      compare: args.compare,
      top: args.top,
      redact: args.redact,
    });
  } catch (error) {
    const message = error instanceof ScanError ? error.message : "Scan failed.";
    io.stderr.write(`${message}\n`);
    return error instanceof ScanError ? 1 : 1;
  }

  for (const warning of report.warnings) {
    const where = !args.redact && warning.file ? ` (${warning.file})` : "";
    io.stderr.write(`tic-score: ${warning.message}${where}\n`);
  }

  if (args.command === "fix") {
    const body = renderFixBody(report);
    const places = destinations(io.cwd, io.home, args.targets, args.global);
    let written: string[] = [];
    if (args.write) {
      written = await writeDestinations(places, body);
    }
    if (args.json) {
      io.stdout.write(
        `${JSON.stringify(
          {
            version: VERSION,
            score: publicScore(report),
            headline: report.headline,
            snippet: body,
            destinations: places.map((place) => place.file),
            written,
            wrote: args.write,
          },
          null,
          2,
        )}\n`,
      );
    } else {
      io.stdout.write(`${body}\n`);
      io.stdout.write(`${whereToPut(places, args.write)}\n`);
    }
    return 0;
  }

  const exports = await writeCards(report, args.out, args.exportCard, io);
  if (exports.error) {
    io.stderr.write(`${exports.error}\n`);
  }

  if (args.json) {
    io.stdout.write(`${JSON.stringify(publicReport(report, exports.paths), null, 2)}\n`);
  } else {
    const color = wantColor(args.plain, io);
    const columns = Number(io.env.COLUMNS);
    const width = Number.isFinite(columns) && columns > 0 ? Math.min(columns - 4, 72) : 64;
    io.stdout.write(`${renderTerminal(report, { color, width })}\n`);
    if (exports.paths.svg || exports.paths.png) {
      const written = [exports.paths.svg, exports.paths.png].filter(Boolean).join(" and ");
      io.stderr.write(`wrote ${written}\n`);
    }
  }

  return exports.error ? 1 : 0;
}

function wantColor(plain: boolean, io: Io): boolean {
  if (plain) return false;
  if (io.env.NO_COLOR !== undefined && io.env.NO_COLOR !== "") return false;
  if (io.env.FORCE_COLOR !== undefined && io.env.FORCE_COLOR !== "0") return true;
  return io.isTTY;
}

async function writeCards(
  report: Report,
  out: string | null,
  exportCard: boolean,
  io: Io,
): Promise<{ paths: { svg?: string; png?: string }; error: string | null }> {
  const paths = cardOutputPaths(io.cwd, out, exportCard);
  if (!paths.svg && !paths.png) return { paths, error: null };
  const svg = renderSvg(report);
  try {
    if (paths.svg) {
      await mkdir(path.dirname(paths.svg), { recursive: true });
      await writeFile(paths.svg, svg, "utf8");
    }
    if (paths.png) {
      const png = renderPng(svg, io.env);
      await mkdir(path.dirname(paths.png), { recursive: true });
      await writeFile(paths.png, png);
    }
    return { paths, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not write the share card.";
    return { paths, error: message };
  }
}

export function cardOutputPaths(
  cwd: string,
  out: string | null,
  exportCard: boolean,
): { svg?: string; png?: string } {
  if (!exportCard) return {};
  const resolve = (file: string) => (path.isAbsolute(file) ? file : path.resolve(cwd, file));
  if (!out) {
    return {
      svg: path.join(cwd, "tic-score-card.svg"),
      png: path.join(cwd, "tic-score-card.png"),
    };
  }
  if (out.endsWith("/") || out.endsWith(path.sep)) {
    const dir = resolve(out);
    return {
      svg: path.join(dir, "tic-score-card.svg"),
      png: path.join(dir, "tic-score-card.png"),
    };
  }
  if (out.endsWith(".svg")) return { svg: resolve(out) };
  if (out.endsWith(".png")) return { png: resolve(out) };
  const base = resolve(out);
  return { svg: `${base}.svg`, png: `${base}.png` };
}

function publicScore(report: Report) {
  return {
    value: report.score.value,
    band: report.score.band,
    gloss: report.score.gloss,
    combined: round2(report.score.combined),
    curated: round2(report.score.curatedComponent),
    discovered: round2(report.score.discoveredComponent),
    formula: FORMULA_LINE,
  };
}

export function publicReport(report: Report, cards: { svg?: string; png?: string }) {
  return {
    version: report.version,
    sessions: report.sessions,
    filesScanned: report.filesScanned,
    messages: report.messages,
    assistantWords: report.assistantWords,
    malformedLines: report.malformedLines,
    skippedFiles: report.skippedFiles,
    agents: report.agents,
    dateStart: report.dateStart,
    dateEnd: report.dateEnd,
    score: publicScore(report),
    headline: report.headline,
    top: report.top.map(publicTic),
    curated: report.curated.map(publicTic),
    discovered: report.discovered.map(publicTic),
    compare: report.compare
      ? {
          cutoff: report.compare.cutoff,
          undatedMessages: report.compare.undatedMessages,
          before: {
            assistantWords: report.compare.before.assistantWords,
            messages: report.compare.before.messages,
            score: report.compare.before.score.value,
            band: report.compare.before.score.band,
          },
          after: {
            assistantWords: report.compare.after.assistantWords,
            messages: report.compare.after.messages,
            score: report.compare.after.score.value,
            band: report.compare.after.score.band,
          },
        }
      : null,
    warnings: report.warnings,
    ...(report.files.length > 0 ? { files: report.files } : {}),
    ...(cards.svg || cards.png ? { exports: cards } : {}),
  };
}

function publicTic(tic: Report["top"][number]) {
  return {
    id: tic.id,
    label: tic.label,
    kind: tic.kind,
    count: tic.count,
    perThousand: round2(tic.ratePerThousand),
    weight: tic.weight,
    sessions: tic.sessions,
    lift: tic.lift === null ? null : round2(tic.lift),
    instead: tic.instead,
  };
}

function invokedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return import.meta.url === pathToFileURL(entry).href;
  }
}

if (invokedDirectly()) {
  run(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "tic-score failed.";
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
}
