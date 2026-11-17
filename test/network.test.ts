import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(full)));
    else if (entry.name.endsWith(".ts") && entry.name !== "table.ts") files.push(full);
  }
  return files;
}

test("the scanner never imports a network client", async () => {
  const files = await sourceFiles("src");
  assert.ok(files.length > 10);
  const banned = [
    /from ["']node:http["']/,
    /from ["']node:https["']/,
    /from ["']node:net["']/,
    /from ["']node:dns["']/,
    /from ["']undici["']/,
    /from ["']node-fetch["']/,
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\bhttp\.request\b/,
    /\bhttps\.request\b/,
    /\bnet\.connect\b/,
  ];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    for (const pattern of banned) {
      assert.equal(pattern.test(text), false, `${file} matched ${pattern}`);
    }
  }
});
