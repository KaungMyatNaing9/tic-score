import type { TargetKind } from "./fix.js";
import type { AgentId } from "./types.js";

export class ArgError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArgError";
  }
}

export interface Args {
  command: "scan" | "fix" | "help" | "version";
  paths: string[];
  agent: "auto" | AgentId;
  redact: boolean;
  exportCard: boolean;
  out: string | null;
  json: boolean;
  plain: boolean;
  compare: string | null;
  top: number;
  write: boolean;
  global: boolean;
  targets: TargetKind[];
}

export function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    command: "scan",
    paths: [],
    agent: "auto",
    redact: true,
    exportCard: true,
    out: null,
    json: false,
    plain: false,
    compare: null,
    top: 5,
    write: false,
    global: false,
    targets: ["claude", "agents", "skill"],
  };

  const rest = [...argv];
  const head = rest[0];
  if (head === "scan" || head === "fix" || head === "help") {
    args.command = head;
    rest.shift();
  }

  let sawHelp = args.command === "help";
  let sawVersion = false;

  while (rest.length > 0) {
    const token = rest.shift();
    if (token === undefined) break;
    if (token === "--") {
      args.paths.push(...rest);
      break;
    }
    if (!token.startsWith("-")) {
      args.paths.push(token);
      continue;
    }
    const [flag, inline] = splitFlag(token);
    switch (flag) {
      case "--help":
      case "-h":
        sawHelp = true;
        break;
      case "--version":
      case "-V":
        sawVersion = true;
        break;
      case "--path":
        args.paths.push(needValue(flag, inline, rest));
        break;
      case "--agent": {
        const value = needValue(flag, inline, rest);
        if (value !== "auto" && value !== "claude" && value !== "codex") {
          throw new ArgError(`--agent must be auto, claude, or codex. Got "${value}".`);
        }
        args.agent = value;
        break;
      }
      case "--compare":
        args.compare = needValue(flag, inline, rest);
        break;
      case "--top": {
        const value = Number(needValue(flag, inline, rest));
        if (!Number.isInteger(value) || value < 1 || value > 20) {
          throw new ArgError("--top must be an integer from 1 to 20.");
        }
        args.top = value;
        break;
      }
      case "--out":
        args.out = needValue(flag, inline, rest);
        break;
      case "--target":
        args.targets = parseTargets(needValue(flag, inline, rest));
        break;
      case "--json":
        args.json = true;
        break;
      case "--plain":
        args.plain = true;
        break;
      case "--write":
        args.write = true;
        break;
      case "--global":
        args.global = true;
        break;
      case "--redact":
        args.redact = true;
        break;
      case "--no-redact":
        args.redact = false;
        break;
      case "--export":
        args.exportCard = true;
        break;
      case "--no-export":
        args.exportCard = false;
        break;
      default:
        throw new ArgError(`Unknown option "${flag}". Try tic-score --help.`);
    }
  }

  if (sawHelp) args.command = "help";
  else if (sawVersion && args.command === "scan" && args.paths.length === 0)
    args.command = "version";
  return args;
}

function splitFlag(token: string): [string, string | undefined] {
  const eq = token.indexOf("=");
  if (eq === -1) return [token, undefined];
  return [token.slice(0, eq), token.slice(eq + 1)];
}

function needValue(flag: string, inline: string | undefined, rest: string[]): string {
  if (inline !== undefined) {
    if (inline === "") throw new ArgError(`${flag} needs a value.`);
    return inline;
  }
  const next = rest.shift();
  if (next === undefined || next.startsWith("-")) throw new ArgError(`${flag} needs a value.`);
  return next;
}

function parseTargets(value: string): TargetKind[] {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const allowed = new Set<TargetKind>(["claude", "agents", "skill"]);
  if (parts.length === 0) throw new ArgError("--target needs claude, agents, and/or skill.");
  for (const part of parts) {
    if (!allowed.has(part as TargetKind)) {
      throw new ArgError(`--target "${part}" is not claude, agents, or skill.`);
    }
  }
  return parts as TargetKind[];
}

export const HELP = `tic-score — count a coding agent's verbal tics from local logs

Usage
  tic-score [scan] [options]
  tic-score fix [options]
  tic-score --help
  tic-score --version

Scan reads assistant prose from Claude Code and Codex CLI session logs on
this machine, counts a catalog of tics plus unusual phrases, and prints a
score card. Nothing is uploaded. The share card contains counts and the tic
phrases only.

Options
  --path <dir|file>     Log location. Repeatable. Replaces the default home
                        directories. A directory is walked for .jsonl files.
  --agent <name>        auto (default), claude, or codex
  --compare <date>      Split the score before and after YYYY-MM-DD (UTC)
  --top <n>             Rows on the card and in the fix snippet (default 5)
  --out <file>          Share card path. No extension writes .svg and .png.
  --no-export           Do not write a share card
  --json                Print the report as JSON on stdout
  --plain               No color
  --redact              Hide log paths. This is the default.
  --no-redact           Include scanned file paths in JSON and warnings.
                        Transcript text is still never printed.
  --write               With fix, write the snippet. Without this flag, fix
                        only prints it.
  --global              With fix --write, also update ~/.claude and ~/.codex
  --target <list>       claude, agents, skill (default: all three)

Defaults
  Claude Code:  \${CLAUDE_CONFIG_DIR:-~/.claude}/projects/**/*.jsonl
  Codex CLI:    \${CODEX_HOME:-~/.codex}/sessions/**/rollout-*.jsonl
                and archived_sessions

Privacy
  --redact is on unless you pass --no-redact. The PNG and SVG never include
  conversation text, file paths, or session ids.

Exit codes
  0  report printed
  1  no logs found, or a card could not be written
  2  bad arguments
`;
