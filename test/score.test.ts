import assert from "node:assert/strict";
import { test } from "node:test";
import { analyze } from "../dist/analyze.js";
import { baselinePerThousand, baselineSize } from "../dist/baseline.js";
import { scoreFromComponents } from "../dist/formula.js";
import { selectDiscoveries } from "../dist/ngrams.js";

test("the score formula is the documented curve", () => {
  const curated = 8;
  const discovered = 4;
  const score = scoreFromComponents(curated, discovered);
  const expected = Math.round(100 * (1 - Math.exp(-(curated + discovered) / 8)));
  assert.equal(score.value, expected);
  assert.equal(score.value, 78);
  assert.equal(score.band, "Catchphrase machine");
  assert.equal(scoreFromComponents(0, 0).value, 0);
  assert.equal(scoreFromComponents(0, 0).band, "Quiet");
});

test("rates are hits per 1,000 assistant words", () => {
  const analysis = analyze(
    [
      {
        agent: "claude",
        sessionId: "s",
        timestamp: Date.parse("2026-01-01T00:00:00Z"),
        prose: `${"load-bearing ".repeat(2)}${"word ".repeat(998)}`,
      },
    ],
    { sessions: 1 },
  );
  const tic = analysis.curated.find((item) => item.id === "load-bearing");
  assert.equal(tic?.count, 2);
  assert.equal(analysis.assistantWords, 1000);
  assert.ok(Math.abs((tic?.ratePerThousand ?? 0) - 2) < 0.001);
});

test("baseline treats 'the' as common and an invented word as rare", () => {
  const size = baselineSize();
  assert.equal(size.unigrams, 8000);
  assert.equal(size.bigrams, 3728);
  const the = baselinePerThousand("the");
  assert.ok(the > 40 && the < 60, `the per thousand was ${the}`);
  assert.ok(baselinePerThousand("quark latch") < 0.2);
});

test("discovery keeps a repeated rare phrase and drops a one-session topic", () => {
  const pieces = ["one", "two", "three", "four"].map((sessionId, index) => ({
    agent: "claude" as const,
    sessionId,
    timestamp: Date.parse("2026-01-01T00:00:00Z") + index,
    prose: `The quark latch holds the ${sessionId} row. The quark latch is explicit. Ordinary words fill the rest of this note.`,
  }));
  pieces.push({
    agent: "claude",
    sessionId: "topic",
    timestamp: Date.parse("2026-02-01T00:00:00Z"),
    prose: `${"The zephyr widget blinks again. ".repeat(8)}Ordinary words fill the rest of this note.`,
  });
  const analysis = analyze(pieces, { sessions: 5 });
  const labels = analysis.discovered.map((item) => item.label);
  assert.ok(labels.includes("quark latch"), labels.join(", "));
  assert.equal(labels.includes("zephyr widget"), false);
  assert.equal(labels.includes("quark"), false);
  assert.equal(labels.includes("the"), false);
  assert.equal(typeof selectDiscoveries, "function");
});

test("compare splits on a UTC date and ignores undated prose", () => {
  const analysis = analyze(
    [
      {
        agent: "claude",
        sessionId: "a",
        timestamp: Date.parse("2026-01-01T00:00:00Z"),
        prose: "The index is load-bearing today.",
      },
      {
        agent: "claude",
        sessionId: "b",
        timestamp: Date.parse("2026-06-01T00:00:00Z"),
        prose: "The index is fine today and the row is fine.",
      },
      {
        agent: "codex",
        sessionId: "c",
        timestamp: null,
        prose: "A dateless load-bearing note.",
      },
    ],
    { compareCutoff: Date.parse("2026-04-15T00:00:00Z"), sessions: 3 },
  );
  assert.ok(analysis.compare);
  assert.equal(analysis.compare?.undatedMessages, 1);
  assert.equal(analysis.compare?.before.assistantWords, 5);
  assert.ok(
    (analysis.compare?.after.score.value ?? 100) < (analysis.compare?.before.score.value ?? 0),
  );
});
