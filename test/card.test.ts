import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { renderPng } from "../dist/card/png.js";
import { CARD_WIDTH, renderSvg } from "../dist/card/svg.js";
import { renderTerminal } from "../dist/card/terminal.js";
import { scanLogs } from "../dist/scan.js";

test("terminal card snapshot from the synthetic fixtures", async () => {
  const report = await scanLogs({
    paths: ["fixtures"],
    home: "/tmp/tic-score-empty-home",
    env: {},
    agent: "auto",
    compare: "2026-04-15",
    top: 5,
    redact: true,
  });
  const card = renderTerminal(report, { color: false, width: 64 });
  const expected = readFileSync("test/snapshots/terminal.txt", "utf8");
  assert.equal(`${card}\n`, expected);
  assert.equal(card.includes("CANARY_PROSE_q7"), false);
  assert.equal(card.includes("promptsuggestiononlyphrase"), false);
  assert.match(card, /load-bearing/);
  assert.match(card, /quark latch/);
  assert.match(card, /Counts and phrases only/);
});

test("svg share card has counts only and no external links", async () => {
  const report = await scanLogs({
    paths: ["fixtures"],
    home: "/tmp/tic-score-empty-home",
    env: {},
    agent: "auto",
    compare: "2026-04-15",
    top: 5,
    redact: true,
  });
  const svg = renderSvg(report);
  assert.match(svg, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.equal(svg.includes("CANARY_PROSE_q7"), false);
  assert.equal(svg.includes("href="), false);
  assert.equal(svg.includes("https://"), false);
  assert.equal(svg.includes("<script"), false);
  assert.equal(svg.includes("<image"), false);
  assert.match(svg, /COUNTS ONLY/);
  assert.match(svg, /load-bearing/);
  assert.match(svg, /width="1200"/);
  assert.equal(CARD_WIDTH, 1200);
  const png = renderPng(svg);
  assert.equal(png[0], 0x89);
  assert.equal(png[1], 0x50);
  assert.equal(png[2], 0x4e);
  assert.equal(png[3], 0x47);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.ok(png.readUInt32BE(20) > 600);
});

test("color output uses ansi and plain output does not", async () => {
  const report = await scanLogs({
    paths: ["fixtures"],
    home: "/tmp/tic-score-empty-home",
    env: {},
    agent: "auto",
    compare: null,
    top: 5,
    redact: true,
  });
  const esc = String.fromCharCode(0x1b);
  assert.equal(renderTerminal(report, { color: true, width: 64 }).includes(esc), true);
  assert.equal(renderTerminal(report, { color: false, width: 64 }).includes(esc), false);
});
