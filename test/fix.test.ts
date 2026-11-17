import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { run } from "../dist/cli.js";
import { renderFixBody, upsertSection } from "../dist/fix.js";
import { scanLogs } from "../dist/scan.js";

function io(cwd: string, home: string) {
  let stdout = "";
  let stderr = "";
  return {
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
    text: () => ({ stdout, stderr }),
  };
}

test("fix body names the measured phrases and no transcript canary", async () => {
  const report = await scanLogs({
    paths: ["fixtures"],
    home: "/tmp/tic-score-empty-home",
    env: {},
    agent: "auto",
    compare: null,
    top: 5,
    redact: true,
  });
  const body = renderFixBody(report);
  assert.match(body, /load-bearing/);
  assert.match(body, /Verbal tics to drop/);
  assert.equal(body.includes("CANARY_PROSE_q7"), false);
  assert.equal(body.includes("—"), false);
});

test("upsert replaces an existing section once", () => {
  const first = upsertSection(null, "alpha\n", "claude");
  const second = upsertSection(first, "beta\n", "claude");
  assert.equal(second.match(/tic-score:start/g)?.length, 1);
  assert.match(second, /beta/);
  assert.equal(second.includes("alpha"), false);
  const skill = upsertSection(null, "rule\n", "skill");
  assert.match(skill, /name: tic-score/);
});

test("fix does not write files unless --write is set", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "tic-fix-"));
  const home = await mkdtemp(path.join(tmpdir(), "tic-home-"));
  const dry = io(cwd, home);
  const dryCode = await run(["fix", "--path", "fixtures", "--no-export", "--plain"], dry);
  assert.equal(dryCode, 0);
  await assert.rejects(readFile(path.join(cwd, "CLAUDE.md"), "utf8"));
  assert.match(dry.text().stdout, /Nothing was written/);
  assert.match(dry.text().stdout, /CLAUDE\.md/);

  const wet = io(cwd, home);
  const wetCode = await run(
    ["fix", "--path", "fixtures", "--no-export", "--plain", "--write", "--target", "claude"],
    wet,
  );
  assert.equal(wetCode, 0);
  const written = await readFile(path.join(cwd, "CLAUDE.md"), "utf8");
  assert.match(written, /tic-score:start/);
  assert.match(written, /load-bearing/);
  assert.equal(written.includes("CANARY_PROSE_q7"), false);
  await assert.rejects(readFile(path.join(home, ".claude", "CLAUDE.md"), "utf8"));
});
