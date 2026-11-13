import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

const exec = promisify(execFile);

test("a packed tarball runs the tic-score bin without a registry", async () => {
  const pack = await exec("npm", ["pack", "--ignore-scripts", "--json"], { cwd: process.cwd() });
  const packed = JSON.parse(pack.stdout) as { filename: string }[];
  const tarball = path.resolve(packed[0]?.filename ?? "");
  assert.match(tarball, /tic-score-0\.1\.0\.tgz$/);

  const dir = await mkdtemp(path.join(tmpdir(), "tic-pack-"));
  await exec("npm", ["init", "-y"], { cwd: dir });
  await exec(
    "npm",
    ["install", "--offline", "--no-audit", "--no-fund", "--ignore-scripts", tarball],
    { cwd: dir },
  );
  const version = await exec("npx", ["--offline", "--no-install", "tic-score", "--version"], {
    cwd: dir,
  });
  assert.equal(version.stdout.trim(), "0.1.0");

  const scan = await exec(
    "npx",
    [
      "--offline",
      "--no-install",
      "tic-score",
      "--path",
      path.resolve("fixtures"),
      "--no-export",
      "--json",
    ],
    { cwd: dir },
  );
  const report = JSON.parse(scan.stdout) as { score: { value: number }; headline: string };
  assert.equal(report.score.value, 63);
  assert.match(report.headline, /load-bearing/);
  const listing = await readFile(path.join(dir, "package.json"), "utf8");
  assert.match(listing, /tic-score/);
});
