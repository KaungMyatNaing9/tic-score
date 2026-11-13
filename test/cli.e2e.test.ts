import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { run } from "../dist/cli.js";
import { defaultRoots } from "../dist/discover.js";

const CANARIES = [
  "CANARY_USER_SECRET_q7",
  "CANARY_TOOL_OUTPUT_q7",
  "CANARY_TOOL_INPUT_q7",
  "CANARY_CODEBLOCK_q7",
  "CANARY_FILEQUOTE_q7",
  "CANARY_THINKING_q7",
  "CANARY_DEV_q7",
  "CANARY_REASONING_q7",
  "CANARY_PROSE_q7",
  "promptsuggestiononlyphrase",
];

function capture(cwd: string, home: string) {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: {
        write(chunk: string) {
          stdout += chunk;
        },
      },
      stderr: {
        write(chunk: string) {
          stderr += chunk;
        },
      },
      cwd,
      env: {} as NodeJS.ProcessEnv,
      home,
      isTTY: false,
    },
    out: () => stdout,
    err: () => stderr,
  };
}

test("default roots follow Claude Code and Codex homes", () => {
  const roots = defaultRoots("/home/ada", {
    CLAUDE_CONFIG_DIR: "/custom/claude",
    CODEX_HOME: "/custom/codex",
  });
  assert.deepEqual(
    roots.map((root) => root.dir),
    ["/custom/claude/projects", "/custom/codex/sessions", "/custom/codex/archived_sessions"],
  );
});

test("end-to-end scan of the synthetic fixtures", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "tic-e2e-"));
  const home = await mkdtemp(path.join(tmpdir(), "tic-home-"));
  const cap = capture(cwd, home);
  const code = await run(
    ["--path", "fixtures", "--no-export", "--plain", "--json", "--compare", "2026-04-15"],
    cap.io,
  );
  assert.equal(code, 0);
  const report = JSON.parse(cap.out()) as {
    sessions: number;
    filesScanned: number;
    assistantWords: number;
    malformedLines: number;
    skippedFiles: number;
    agents: { claude: number; codex: number };
    score: { value: number; band: string };
    headline: string;
    top: { label: string; count: number }[];
    discovered: { label: string }[];
    curated: { id: string; count: number }[];
    compare: { before: { score: number }; after: { score: number }; undatedMessages: number };
    files?: string[];
  };
  assert.equal(report.sessions, 12);
  assert.equal(report.filesScanned, 14);
  assert.equal(report.assistantWords, 7461);
  assert.equal(report.malformedLines, 5);
  assert.equal(report.skippedFiles, 2);
  assert.deepEqual(report.agents, { claude: 6, codex: 6 });
  assert.equal(report.score.value, 63);
  assert.equal(report.score.band, "Tic-forward");
  assert.equal(report.headline, 'Your agent said "load-bearing" 15 times across 12 sessions.');
  assert.equal(report.top[0]?.label, "load-bearing");
  assert.equal(report.top[0]?.count, 15);
  assert.deepEqual(
    report.discovered.map((item) => item.label),
    ["quark latch"],
  );
  const count = (id: string) => report.curated.find((tic) => tic.id === id)?.count ?? 0;
  assert.equal(count("load-bearing"), 15);
  assert.equal(count("absolutely-right"), 5);
  assert.equal(count("let-me"), 5);
  assert.equal(count("great-question"), 3);
  assert.equal(count("delve"), 4);
  assert.equal(count("robust"), 3);
  assert.equal(count("em-dash"), 10);
  assert.equal(count("tapestry"), 0);
  assert.equal(count("nestled"), 0);
  assert.equal(count("vibrant"), 0);
  assert.equal(count("multifaceted"), 0);
  assert.equal(count("pivotal"), 0);
  assert.equal(count("realm"), 0);
  assert.equal(report.compare.before.score, 89);
  assert.equal(report.compare.after.score, 7);
  assert.equal(report.compare.undatedMessages, 1);
  assert.equal(report.files, undefined);
  const blob = cap.out() + cap.err();
  for (const canary of CANARIES) assert.equal(blob.includes(canary), false, canary);
  assert.equal(blob.includes("/tmp/synthetic-widget"), false);
});

test("--no-redact keeps file paths and still hides transcript text", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "tic-e2e-"));
  const home = await mkdtemp(path.join(tmpdir(), "tic-home-"));
  const cap = capture(cwd, home);
  const code = await run(["--path", "fixtures", "--no-export", "--json", "--no-redact"], cap.io);
  assert.equal(code, 0);
  const report = JSON.parse(cap.out()) as { files: string[] };
  assert.ok(report.files.some((file) => file.endsWith("edge.jsonl")));
  for (const canary of CANARIES) assert.equal(cap.out().includes(canary), false);
});

test("missing logs exit 1 and bad flags exit 2", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "tic-e2e-"));
  const home = await mkdtemp(path.join(tmpdir(), "tic-home-"));
  const missing = capture(cwd, home);
  assert.equal(await run(["--path", cwd, "--no-export"], missing.io), 1);
  assert.match(missing.err(), /No session logs found/);
  const bad = capture(cwd, home);
  assert.equal(await run(["--top", "0"], bad.io), 2);
});
