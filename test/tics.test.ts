import assert from "node:assert/strict";
import { test } from "node:test";
import { countTicHits, TICS } from "../dist/tics.js";

test("every curated phrase matches its example and misses its negative", () => {
  for (const tic of TICS) {
    const regex = new RegExp(tic.pattern, tic.flags.includes("g") ? tic.flags : `${tic.flags}g`);
    assert.equal(regex.test(tic.example), true, `${tic.id} should match ${tic.example}`);
    regex.lastIndex = 0;
    assert.equal(regex.test(tic.negative), false, `${tic.id} should not match ${tic.negative}`);
    assert.ok(tic.weight > 0 && tic.weight <= 2, tic.id);
    assert.ok(tic.instead.length > 0, tic.id);
  }
});

test("longer phrases consume shorter ones", () => {
  const counts = countTicHits(
    "Let me know if you need it. Let me trace the offset. You're absolutely right. You're right.",
  );
  assert.equal(counts.get("let-me-know"), 1);
  assert.equal(counts.get("let-me"), 1);
  assert.equal(counts.get("absolutely-right"), 1);
  assert.equal(counts.get("youre-right"), 1);
  assert.equal(counts.get("absolutely"), undefined);
});

test("curly apostrophes and spaced load bearing match", () => {
  const counts = countTicHits("You’re absolutely right. It’s worth noting the load bearing wall.");
  assert.equal(counts.get("absolutely-right"), 1);
  assert.equal(counts.get("worth-noting"), 1);
  assert.equal(counts.get("load-bearing"), 1);
});

test("em dashes count and ascii double hyphens do not", () => {
  const counts = countTicHits("Keep the name — index — and a -- flag.");
  assert.equal(counts.get("em-dash"), 2);
});
