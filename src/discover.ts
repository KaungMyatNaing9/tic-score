import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

export type RootKind = "claude" | "codex" | "custom";

export interface LogRoot {
  dir: string;
  kind: RootKind;
}

const SKIP_BASENAMES = new Set(["history.jsonl", "session_index.jsonl", "logs.jsonl"]);

export function defaultRoots(home: string, env: NodeJS.ProcessEnv): LogRoot[] {
  const claudeHome = env.CLAUDE_CONFIG_DIR || path.join(home, ".claude");
  const codexHome = env.CODEX_HOME || path.join(home, ".codex");
  return [
    { dir: path.join(claudeHome, "projects"), kind: "claude" },
    { dir: path.join(codexHome, "sessions"), kind: "codex" },
    { dir: path.join(codexHome, "archived_sessions"), kind: "codex" },
  ];
}

export function isPromptSuggestion(file: string): boolean {
  const base = path.basename(file);
  return /prompt[_-]suggestion/i.test(base);
}

export function isSkippedIndex(file: string): boolean {
  return SKIP_BASENAMES.has(path.basename(file).toLowerCase());
}

export function acceptsFile(file: string, kind: RootKind): boolean {
  if (!file.endsWith(".jsonl")) return false;
  if (isPromptSuggestion(file) || isSkippedIndex(file)) return false;
  if (kind === "codex") return path.basename(file).startsWith("rollout-");
  return true;
}

export async function findLogFiles(roots: readonly LogRoot[]): Promise<{
  files: string[];
  skipped: string[];
  missing: string[];
}> {
  const files: string[] = [];
  const skipped: string[] = [];
  const missing: string[] = [];
  for (const root of roots) {
    const found = await walk(root.dir);
    if (found === null) {
      missing.push(root.dir);
      continue;
    }
    for (const file of found) {
      if (!file.endsWith(".jsonl")) continue;
      if (isPromptSuggestion(file) || isSkippedIndex(file)) {
        skipped.push(file);
        continue;
      }
      if (!acceptsFile(file, root.kind)) continue;
      files.push(file);
    }
  }
  files.sort();
  skipped.sort();
  return { files, skipped, missing };
}

async function walk(dir: string): Promise<string[] | null> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await walk(full);
      if (nested) files.push(...nested);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}
