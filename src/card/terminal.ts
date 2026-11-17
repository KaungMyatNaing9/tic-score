import { FORMULA_LINE } from "../formula.js";
import type { Report, TicCount } from "../types.js";
import { fit, formatInt, formatRate, padLeft, padRight, plural } from "../util.js";

export interface TerminalOptions {
  color: boolean;
  width?: number;
}

const INNER_DEFAULT = 64;

export function renderTerminal(report: Report, options: TerminalOptions): string {
  const inner = Math.max(48, Math.min(options.width ?? INNER_DEFAULT, 78));
  const paint = options.color ? colorize : (text: string) => text;
  const scoreColor = bandAnsi(report.score.value);
  const lines: string[] = [];
  const push = (plain: string, colored = plain) => {
    lines.push(boxLine(colored, plain, inner));
  };
  const blank = () => push("");
  const tics = cardRows(report);

  push(
    pair("TIC SCORE", String(report.score.value), inner),
    pair(paint("TIC SCORE", "1"), paint(String(report.score.value), `1;${scoreColor}`), inner),
  );
  push(report.score.band, paint(report.score.band, `1;${scoreColor}`));
  push(report.score.gloss, paint(report.score.gloss, "2"));
  blank();
  for (const line of wrap(report.headline, inner)) push(line);
  blank();

  if (tics.length === 0) {
    push("Nothing in the catalog, and no unusual phrase cleared the bar.");
  } else {
    const columns = `${padRight("phrase", 24)} ${" ".repeat(10)} ${padLeft("/1k", 6)} ${padLeft("times", 6)}`;
    push(columns, paint(columns, "2"));
    const maxRate = Math.max(...tics.map((tic) => tic.ratePerThousand), 0.0001);
    for (const tic of tics) {
      const label = `${tic.kind === "discovered" ? "* " : ""}${tic.label}`;
      const bar = blockBar(tic.ratePerThousand / maxRate, 10);
      const rate = padLeft(formatRate(tic.ratePerThousand), 6);
      const count = padLeft(formatInt(tic.count), 6);
      const plain = `${padRight(fit(label, 24), 24)} ${bar} ${rate} ${count}`;
      const colored = `${padRight(fit(label, 24), 24)} ${paint(bar, scoreColor)} ${rate} ${count}`;
      push(fit(plain, inner), fitVisible(colored, plain, inner));
    }
    if (tics.some((tic) => tic.kind === "discovered")) {
      push(
        "* found in your logs, not on the built-in list",
        paint("* found in your logs, not on the built-in list", "2"),
      );
    }
  }

  blank();
  push(
    `${plural(report.sessions, "session")} · ${plural(report.assistantWords, "assistant word")}`,
  );
  const dates =
    report.dateStart && report.dateEnd
      ? `${report.dateStart} → ${report.dateEnd}`
      : "dates unavailable";
  push(
    `${dates} · claude ${formatInt(report.agents.claude)} · codex ${formatInt(report.agents.codex)}`,
  );
  push(FORMULA_LINE, paint(FORMULA_LINE, "2"));
  const components = `C = ${report.score.curatedComponent.toFixed(2)} curated + ${report.score.discoveredComponent.toFixed(2)} discovered`;
  push(components, paint(components, "2"));
  if (report.curated.filter((tic) => tic.count > 0).length > report.top.length) {
    push("Score counts every curated tic, not only the rows above.");
  }

  if (report.compare) {
    blank();
    const day = report.compare.cutoff.slice(0, 10);
    push(
      `After ${day}: score ${report.compare.before.score.value} → ${report.compare.after.score.value}`,
      `After ${day}: score ${paint(String(report.compare.before.score.value), "2")} → ${paint(String(report.compare.after.score.value), `1;${scoreColor}`)}`,
    );
    for (const tic of tics) {
      const before = rateIn(report.compare.before.tics, tic);
      const after = rateIn(report.compare.after.tics, tic);
      const line = `${padRight(fit(tic.label, 24), 24)} ${padLeft(formatRate(before), 6)} → ${padLeft(formatRate(after), 6)}  ${change(before, after)}`;
      push(fit(line, inner));
    }
    if (report.compare.undatedMessages > 0) {
      push(
        report.compare.undatedMessages === 1
          ? "1 message had no timestamp and was left out of the comparison."
          : `${plural(report.compare.undatedMessages, "message")} had no timestamp and were left out of the comparison.`,
      );
    }
  }

  blank();
  push("Counts and phrases only. No transcript text leaves this machine.");

  const top = `┌${"─".repeat(inner + 2)}┐`;
  const bottom = `└${"─".repeat(inner + 2)}┘`;
  return [top, ...lines, bottom].join("\n");
}

/** Top contributors, plus the strongest off-list phrase when it missed the cut. */
export function cardRows(report: Report): TicCount[] {
  const rows = [...report.top];
  const found = report.discovered.find((tic) => !rows.some((row) => row.id === tic.id));
  if (found && found.count > 0) rows.push(found);
  return rows;
}

function rateIn(tics: readonly TicCount[], tic: TicCount): number {
  return tics.find((item) => item.id === tic.id)?.ratePerThousand ?? 0;
}

function change(before: number, after: number): string {
  if (before === 0 && after === 0) return "flat";
  if (before === 0) return "new";
  const pct = Math.round(((after - before) / before) * 100);
  if (pct === 0) return "flat";
  return pct < 0 ? `down ${Math.abs(pct)}%` : `up ${pct}%`;
}

function blockBar(fraction: number, width: number): string {
  const filled = Math.round(Math.max(0, Math.min(1, fraction)) * width);
  return `${"#".repeat(filled)}${"-".repeat(width - filled)}`;
}

function pair(left: string, right: string, width: number): string {
  const gap = width - [...left].length - [...right].length;
  if (gap >= 1) return `${left}${" ".repeat(gap)}${right}`;
  return fit(left, width);
}

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if ([...next].length > width && current) {
      lines.push(current);
      current = fit(word, width);
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function boxLine(colored: string, plain: string, inner: number): string {
  const pad = inner - [...plain].length;
  return `│ ${colored}${" ".repeat(Math.max(0, pad))} │`;
}

function colorize(text: string, code: string): string {
  return `\x1b[${code}m${text}\x1b[0m`;
}

function bandAnsi(score: number): string {
  if (score <= 15) return "32";
  if (score <= 35) return "33";
  if (score <= 55) return "35";
  if (score <= 75) return "31";
  return "91";
}

function fitVisible(colored: string, plain: string, inner: number): string {
  if ([...plain].length <= inner) return colored;
  return fit(plain, inner);
}
