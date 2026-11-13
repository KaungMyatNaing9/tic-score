import { FORMULA_LINE } from "../formula.js";
import type { Report } from "../types.js";
import { formatInt, formatRate, plural, xmlEscape } from "../util.js";
import { cardRows } from "./terminal.js";

export const CARD_WIDTH = 1200;

export function scoreColor(score: number): string {
  if (score <= 15) return "#1f7a4d";
  if (score <= 35) return "#a16207";
  if (score <= 55) return "#c2410c";
  if (score <= 75) return "#b42318";
  return "#7f1d1d";
}

const SANS = "Inter, 'Noto Sans', 'DejaVu Sans', 'Liberation Sans', sans-serif";
const SERIF = "'Noto Serif', 'Liberation Serif', Georgia, serif";
const MONO = "'JetBrains Mono', 'DejaVu Sans Mono', 'Liberation Mono', ui-monospace, monospace";

/** Share card. Phrases and counts only: no transcript sentences, paths, or session ids. */
export function renderSvg(report: Report): string {
  const accent = scoreColor(report.score.value);
  const headline = wrap(report.headline, 46).slice(0, 3);
  const top = cardRows(report).slice(0, 6);
  const maxRate = Math.max(...top.map((tic) => tic.ratePerThousand), 0.0001);
  const dates =
    report.dateStart && report.dateEnd
      ? `${report.dateStart} → ${report.dateEnd}`
      : "dates unavailable";
  const meta = `${plural(report.sessions, "session")} · ${plural(report.assistantWords, "assistant word")} · ${dates}`;
  const agents = `claude ${formatInt(report.agents.claude)} · codex ${formatInt(report.agents.codex)}`;
  const formula = `${FORMULA_LINE}   C = ${report.score.curatedComponent.toFixed(2)} curated + ${report.score.discoveredComponent.toFixed(2)} discovered`;

  const headlineSvg = headline
    .map(
      (line, index) =>
        `<text x="72" y="${292 + index * 40}" font-family="${SERIF}" font-size="32" fill="#1c1612">${xmlEscape(line)}</text>`,
    )
    .join("\n");

  let cursor = 292 + headline.length * 40 + 36;
  const compare =
    report.compare === null
      ? ""
      : `<text x="72" y="${cursor}" font-family="${SANS}" font-size="16" fill="#6f675e">After ${xmlEscape(report.compare.cutoff.slice(0, 10))}: score ${report.compare.before.score.value} → ${report.compare.after.score.value}</text>`;
  if (report.compare) cursor += 36;

  const rowSvg = top
    .map((tic, index) => {
      const y = cursor + index * 48;
      const width = Math.max(8, Math.round((tic.ratePerThousand / maxRate) * 340));
      const label =
        tic.kind === "discovered" ? `${fitLabel(tic.label, 18)} · found` : fitLabel(tic.label, 26);
      return `<text x="72" y="${y}" font-family="${SANS}" font-size="20" fill="#1c1612">${xmlEscape(label)}</text>
        <rect x="520" y="${y - 16}" width="340" height="10" rx="5" fill="#e6dfd4"/>
        <rect x="520" y="${y - 16}" width="${width}" height="10" rx="5" fill="${accent}"/>
        <text x="880" y="${y}" font-family="${MONO}" font-size="18" fill="#1c1612">${formatRate(tic.ratePerThousand)}</text>
        <text x="960" y="${y}" font-family="${MONO}" font-size="16" fill="#6f675e">/1k</text>
        <text x="1128" y="${y}" font-family="${MONO}" font-size="18" fill="#1c1612" text-anchor="end">${formatInt(tic.count)}</text>`;
    })
    .join("\n");

  const footerY = cursor + Math.max(top.length, 1) * 48 + 8;
  const height = footerY + 88;
  const panelHeight = height - 56;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${height}" viewBox="0 0 ${CARD_WIDTH} ${height}">
  <rect width="${CARD_WIDTH}" height="${height}" fill="#231c16"/>
  <rect x="28" y="28" width="1144" height="${panelHeight}" rx="22" fill="#f4efe6"/>
  <rect x="28" y="28" width="14" height="${panelHeight}" rx="7" fill="${accent}"/>
  <text x="72" y="78" font-family="${SANS}" font-size="15" font-weight="700" letter-spacing="2.4" fill="#8a8175">TIC SCORE</text>
  <text x="1128" y="78" font-family="${SANS}" font-size="14" font-weight="600" letter-spacing="1.6" fill="#8a8175" text-anchor="end">COUNTS ONLY</text>
  <text x="72" y="226" font-family="${SANS}" font-size="120" font-weight="700" fill="${accent}">${report.score.value}</text>
  <text x="340" y="164" font-family="${SANS}" font-size="22" font-weight="700" letter-spacing="1.8" fill="${accent}">${xmlEscape(report.score.band.toUpperCase())}</text>
  <text x="340" y="198" font-family="${SERIF}" font-size="22" fill="#3f3832">${xmlEscape(report.score.gloss)}</text>
  ${headlineSvg}
  ${compare}
  ${rowSvg}
  <text x="72" y="${footerY}" font-family="${SANS}" font-size="16" fill="#3f3832">${xmlEscape(meta)}</text>
  <text x="72" y="${footerY + 26}" font-family="${SANS}" font-size="16" fill="#6f675e">${xmlEscape(agents)}</text>
  <text x="72" y="${footerY + 52}" font-family="${MONO}" font-size="13" fill="#8a8175">${xmlEscape(formula)}</text>
  <text x="1128" y="${footerY + 52}" font-family="${SANS}" font-size="14" fill="#8a8175" text-anchor="end">tic-score · local</text>
</svg>
`;
}

function fitLabel(value: string, max: number): string {
  const chars = [...value];
  if (chars.length <= max) return value;
  return `${chars.slice(0, Math.max(0, max - 1)).join("")}…`;
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}
