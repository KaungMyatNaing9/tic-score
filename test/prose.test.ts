import assert from "node:assert/strict";
import { test } from "node:test";
import { extractProse } from "../dist/prose.js";
import { countTicHits } from "../dist/tics.js";
import { countWords } from "../dist/util.js";

test("strips fenced code, file tags, diffs, and numbered dumps", () => {
  const text = [
    "The offset is load-bearing.",
    "```ts",
    'const phrase = "load-bearing";',
    'const mood = "nestled";',
    "```",
    '<file path="src/parser.ts">',
    'export const area = "realm";',
    "</file>",
    '12| const label = "load-bearing";',
    '13| const mood = "nestled";',
    '    const hidden = "load-bearing";',
    "    function skip() { return 1; }",
    "diff --git a/src/index.ts b/src/index.ts",
    "--- a/src/index.ts",
    "+++ b/src/index.ts",
    "@@ -1 +1 @@",
    '-const old = "load-bearing";',
    "The comment is not a tic.",
  ].join("\n");
  const prose = extractProse(text);
  const counts = countTicHits(prose);
  assert.equal(counts.get("load-bearing"), 1);
  assert.equal(counts.get("nestled"), undefined);
  assert.equal(counts.get("realm"), undefined);
  assert.match(prose, /The comment is not a tic/);
  assert.equal(prose.includes("nestled"), false);
});

test("an unclosed fence eats the rest of the text", () => {
  const prose = extractProse("Visible.\n```\nload-bearing nestled");
  assert.equal(prose.includes("load-bearing"), false);
  assert.match(prose, /Visible/);
});

test("word count keeps hyphenated compounds and drops the em dash", () => {
  assert.equal(countWords("The index is load-bearing — really."), 5);
});
