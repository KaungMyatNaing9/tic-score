const FILE_TAGS = [
  "file",
  "file_contents",
  "file_content",
  "attachment",
  "document",
  "snippet",
  "quoted_file",
  "source",
  "old_str",
  "new_str",
  "thinking",
  "antthinking",
  "reasoning",
];

/**
 * Keep the assistant's own prose.
 * Drops fenced code, tagged file dumps, unified diffs, and numbered file views.
 * Inline quotations and short inline code stay. Those are not file dumps.
 */
export function extractProse(input: string): string {
  let text = input
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  text = stripFences(text);
  text = stripTags(text);
  text = stripDiffs(text);
  text = stripNumberedDumps(text);
  text = stripIndentedCode(text);
  return text;
}

function stripTags(text: string): string {
  let next = text;
  for (const tag of FILE_TAGS) {
    const closed = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, "gi");
    next = next.replace(closed, "\n");
    const unclosed = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*$`, "gi");
    next = next.replace(unclosed, "\n");
  }
  return next;
}

function stripFences(input: string): string {
  const lines = input.split("\n");
  const out: string[] = [];
  let fence: string | null = null;
  for (const line of lines) {
    const match = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(line);
    if (match) {
      const marks = match[2] ?? "";
      const info = match[3] ?? "";
      if (fence === null) {
        fence = marks;
        continue;
      }
      const sameChar = marks[0] === fence[0];
      if (sameChar && marks.length >= fence.length && info.trim() === "") {
        fence = null;
        continue;
      }
    }
    if (fence === null) out.push(line);
  }
  return out.join("\n");
}

function stripDiffs(input: string): string {
  const lines = input.split("\n");
  const out: string[] = [];
  let inDiff = false;
  for (const line of lines) {
    if (/^diff --git /.test(line) || /^@@\s/.test(line)) {
      inDiff = true;
      continue;
    }
    if (inDiff) {
      if (
        line === "" ||
        /^(?:---|\+\+\+) [ab]\//.test(line) ||
        /^[+\- ]/.test(line) ||
        /^\\ No newline/.test(line) ||
        /^index /.test(line) ||
        /^(?:new|deleted) file /.test(line)
      ) {
        if (line === "") inDiff = false;
        continue;
      }
      inDiff = false;
    }
    out.push(line);
  }
  return out.join("\n");
}

function isNumberedDump(line: string): boolean {
  return /^\s*\d{1,6}\s*[|:]\s?/.test(line);
}

function stripNumberedDumps(input: string): string {
  const lines = input.split("\n");
  const out: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const current = lines[index] ?? "";
    const upcoming = lines[index + 1] ?? "";
    if (isNumberedDump(current) && isNumberedDump(upcoming)) {
      while (index < lines.length) {
        const line = lines[index] ?? "";
        if (!isNumberedDump(line) && line !== "") break;
        index += 1;
      }
      continue;
    }
    out.push(current);
    index += 1;
  }
  return out.join("\n");
}

function looksLikeCode(line: string): boolean {
  return /^\s{4,}|\t/.test(line) && /[{}();=]|^\s*\/\/|^\s*#\s/.test(line);
}

function stripIndentedCode(input: string): string {
  const lines = input.split("\n");
  const out: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const current = lines[index] ?? "";
    const upcoming = lines[index + 1] ?? "";
    if (looksLikeCode(current) && looksLikeCode(upcoming)) {
      while (index < lines.length && looksLikeCode(lines[index] ?? "")) index += 1;
      continue;
    }
    out.push(current);
    index += 1;
  }
  return out.join("\n");
}
