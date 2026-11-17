import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { scanLogs } from "../dist/scan.js";

async function bytesIn(dir: string): Promise<number> {
  const entries = await readdir(dir, { withFileTypes: true });
  let total = 0;
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += await bytesIn(full);
    else total += (await stat(full)).size;
  }
  return total;
}

const root = "fixtures";
const bytes = await bytesIn(root);
const started = performance.now();
const report = await scanLogs({
  paths: [root],
  home: "/tmp/tic-score-empty-home",
  env: {},
  agent: "auto",
  compare: "2026-04-15",
  top: 5,
  redact: true,
});
const onceMs = performance.now() - started;

const repeats = 20;
const repeatStarted = performance.now();
for (let i = 0; i < repeats; i += 1) {
  await scanLogs({
    paths: [root],
    home: "/tmp/tic-score-empty-home",
    env: {},
    agent: "auto",
    compare: null,
    top: 5,
    redact: true,
  });
}
const repeatMs = performance.now() - repeatStarted;

console.log(
  JSON.stringify(
    {
      fixtureBytes: bytes,
      filesScanned: report.filesScanned,
      assistantWords: report.assistantWords,
      firstScanMs: Number(onceMs.toFixed(1)),
      repeats,
      repeatTotalMs: Number(repeatMs.toFixed(1)),
      meanRepeatMs: Number((repeatMs / repeats).toFixed(1)),
    },
    null,
    2,
  ),
);
