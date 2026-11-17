import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { analyze } from "../dist/analyze.js";
import { mergeSnapshots, parseClaude } from "../dist/parse/claude.js";
import { parseCodex } from "../dist/parse/codex.js";
import { detectFormat } from "../dist/parse/detect.js";

async function claudeFile(file: string) {
  const text = await readFile(file, "utf8");
  const parsed = parseClaude(text, file);
  return { parsed, analysis: analyze(parsed.pieces, { sessions: 1 }) };
}

test("snapshot lines do not double-count, and delta lines are kept", () => {
  assert.equal(
    mergeSnapshots([
      "Let me check the index.",
      "Let me check the index. The cache is load-bearing here.",
    ]),
    "Let me check the index. The cache is load-bearing here.",
  );
  const merged = mergeSnapshots(["You're absolutely correct.", "The retry loop is the bug."]);
  assert.match(merged, /absolutely correct/);
  assert.match(merged, /retry loop/);
});

test("edge fixture counts prose tics and drops every other channel", async () => {
  const { parsed, analysis } = await claudeFile("fixtures/claude/edge.jsonl");
  assert.equal(parsed.malformed, 1);
  const count = (id: string) => analysis.curated.find((tic) => tic.id === id)?.count ?? 0;
  assert.equal(count("absolutely-right"), 1);
  assert.equal(count("let-me"), 1);
  assert.equal(count("load-bearing"), 1);
  assert.equal(count("great-question"), 1);
  assert.equal(count("em-dash"), 2);
  assert.equal(count("nestled"), 0);
  assert.equal(count("realm"), 0);
  assert.equal(count("tapestry"), 0);
  assert.equal(count("pivotal"), 0);
  const prose = parsed.pieces.map((piece) => piece.prose).join("\n");
  assert.equal(prose.includes("CANARY_CODEBLOCK_q7"), false);
  assert.equal(prose.includes("CANARY_FILEQUOTE_q7"), false);
  assert.equal(prose.includes("CANARY_TOOL_INPUT_q7"), false);
  assert.equal(prose.includes("CANARY_THINKING_q7"), false);
  assert.match(prose, /CANARY_PROSE_q7/);
});

test("a rewound branch is not counted", async () => {
  const { analysis } = await claudeFile("fixtures/claude/rewind.jsonl");
  assert.equal(analysis.assistantWords, 10);
  assert.equal(analysis.curated.find((tic) => tic.id === "tapestry")?.count ?? 0, 0);
  assert.equal(analysis.curated.find((tic) => tic.id === "load-bearing")?.count ?? 0, 0);
  assert.equal(analysis.headline.includes("abandoned"), false);
});

test("codex tool output, reasoning, and developer text are ignored", async () => {
  const text = await readFile(
    "fixtures/codex/sessions/2026/03/02/rollout-2026-03-02T15-04-05-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jsonl",
    "utf8",
  );
  assert.equal(detectFormat(text), "codex");
  const parsed = parseCodex(text, "codex");
  const analysis = analyze(parsed.pieces, { sessions: 1 });
  const count = (id: string) => analysis.curated.find((tic) => tic.id === id)?.count ?? 0;
  assert.equal(count("absolutely-right"), 1);
  assert.equal(count("load-bearing"), 1);
  assert.equal(count("cutting-edge"), 1);
  assert.equal(count("realm"), 0);
  assert.equal(count("pivotal"), 0);
  assert.equal(count("multifaceted"), 0);
  assert.equal(count("vibrant"), 0);
  const prose = parsed.pieces.map((piece) => piece.prose).join("\n");
  assert.equal(prose.includes("CANARY_DEV_q7"), false);
  assert.equal(prose.includes("CANARY_TOOL_OUTPUT_q7"), false);
  assert.equal(prose.includes("CANARY_REASONING_q7"), false);
  assert.equal(prose.includes("CANARY_CODEBLOCK_q7"), false);
});

test("agent_message is a fallback only when no canonical assistant text copies it", async () => {
  const text = await readFile(
    "fixtures/codex/sessions/2026/03/11/rollout-2026-03-11T00-00-00-eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.jsonl",
    "utf8",
  );
  const parsed = parseCodex(text, "fallback");
  const analysis = analyze(parsed.pieces, { sessions: 1 });
  assert.equal(parsed.pieces.length, 1);
  assert.equal(analysis.curated.find((tic) => tic.id === "circle-back")?.count, 1);
});

test("a reverted rollout filename is still read", async () => {
  const text = await readFile(
    "fixtures/codex/sessions/2026/02/02/rollout-2026-02-02T10-00-00-cccccccc-cccc-4ccc-8ccc-cccccccccccc_dddddddd-dddd-4ddd-8ddd-dddddddddddd.jsonl",
    "utf8",
  );
  const analysis = analyze(parseCodex(text, "reverted").pieces, { sessions: 1 });
  assert.equal(analysis.curated.find((tic) => tic.id === "moreover")?.count, 1);
});

test("malformed and empty files do not throw", async () => {
  const weird = await readFile("fixtures/claude/weird.jsonl", "utf8");
  const parsed = parseClaude(weird, "weird");
  assert.equal(parsed.malformed, 3);
  assert.equal(parsed.pieces.length, 0);
  const empty = parseClaude("", "empty");
  assert.equal(empty.pieces.length, 0);
});
