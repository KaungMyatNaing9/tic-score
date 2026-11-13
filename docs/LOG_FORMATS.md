# Log formats

Checked on 2026-11-13. This machine had no `~/.claude` and no `~/.codex` tree, so nothing below was confirmed by opening one of Kaung's real sessions. "Verified" means a public source described it and the parser follows that description. "Assumed" means the parser accepts it so a slightly different file does not crash or silently double-count, and a test covers the behavior.

Sources read for this:

- [clog `docs/SOURCE_FORMATS.md`](https://github.com/BFriedland/clog/blob/main/docs/SOURCE_FORMATS.md), which dates its own notes to 2026-07 for Claude Code 2.1.x and Codex CLI rollouts
- [agenthud Claude session schema](https://github.com/neochoon/agenthud/blob/main/docs/schemas/claude-session.md)
- [claudeops-tui JSONL notes](https://github.com/FullFran/claudeops-tui/blob/main/docs/jsonl-format.md)
- Codex `rollout` crate: `SESSIONS_SUBDIR`, `ARCHIVED_SESSIONS_SUBDIR`, and `rollout_file_name.rs` (`rollout-YYYY-MM-DDTHH-MM-SS-<thread id>.jsonl`, with `_` plus a second id for a reverted thread)
- Codex field notes: [DEV.to, v0.130.0](https://dev.to/milkoor/reverse-engineering-codex-cli-rollout-traces-3b9b) and the [continue-codex-work file structure](https://github.com/daymade/claude-code-skills/blob/main/daymade-claude-code/continue-codex-work/references/file_structure.md)

## Claude Code

### Verified from those notes

- Sessions are JSONL under `~/.claude/projects/<encoded-cwd>/<session uuid>.jsonl`.
- `CLAUDE_CONFIG_DIR` is the widely documented home override. This repo treats it as the parent of `projects/`.
- A line is one JSON object with a `type`. Conversational lines carry `timestamp`, `uuid`, `parentUuid`, `sessionId`.
- Assistant `message.content` is an array of `text`, `thinking`, and `tool_use` blocks. Tool results arrive as `user` lines with `tool_result` blocks, often with `toolUseResult`.
- Several lines can share `message.id` because a reply is written as it streams. `requestId` is also shared across those lines.
- `parentUuid` is a tree. Rewinding and continuing leaves the abandoned branch in the same file.
- Subagent transcripts live in `<session>/subagents/`. `agent-aprompt_suggestion-*` files are UI prompt suggestions and are skipped.
- Other line types seen in the notes, and ignored here: `summary`, `system`, `attachment`, `progress`, `file-history-snapshot`, `queue-operation`, permission and title records.

### What this parser does

- Counts `text` blocks on `type: "assistant"` only. Thinking, tool use, and tool results are not prose.
- Skips records with `isApiErrorMessage: true`.
- If the file has a `parentUuid` chain, it keeps the latest leaf's ancestry and drops other branches. A file with no usable chain is read in order.
- Lines that share `message.id` (or `requestId` when `id` is missing) are merged. If a later line extends an earlier one, it is treated as a snapshot and the longer text is kept. Otherwise the blocks are concatenated.
- Subagent files other than prompt suggestions are separate sessions. Their assistant prose counts.

### Assumed

- Older logs may store `message.content` as a plain string. The parser accepts that. The 2026 field notes describe an array.
- Streaming lines might be cumulative snapshots or one new block per line. Both are handled. The notes disagree on which one current Claude Code writes.
- `requestId` is a fallback grouping key only when `message.id` is absent.
- Records with no `uuid` are still counted when a graph exists, because they cannot be placed on a branch.
- A broken parent link stops the walk. The connected suffix is counted. The file is not reread in full order.
- Snake-case `session_id` and `parent_uuid` are accepted. The notes use camel case.

## Codex CLI

### Verified from those notes and the filename source

- Plain rollouts live at `~/.codex/sessions/YYYY/MM/DD/rollout-<timestamp>-<id>.jsonl`.
- Archived sessions use the same shape under `archived_sessions/`.
- `CODEX_HOME` overrides `~/.codex`. The rollout crate names the sessions directory.
- The official basename is `rollout-YYYY-MM-DDTHH-MM-SS-<thread id>.jsonl`. A reverted thread appends `_` and a second id. The timestamp uses hyphens, not colons.
- Each line is `{ timestamp, type, payload }`.
- `response_item` / `message` with `role: "assistant"` carries `output_text`. User text is `input_text`. `developer` messages are instructions.
- `function_call`, `function_call_output`, `custom_tool_call`, and `reasoning` are tool or hidden model text.
- `event_msg` types include `agent_message`, `user_message`, `task_complete` (`last_agent_message`), and `token_count`. Field notes say `agent_message` mirrors the assistant reply.

### What this parser does

- Counts assistant `output_text` / `text` blocks, and a string `content` when that is all the line has.
- Ignores developer, user, reasoning, tool calls, and tool output.
- Ignores `compacted` records so a replacement history does not count the thread again.
- Uses `agent_message` and `task_complete.last_agent_message` only when the normalized prose is not the same as, or a prefix of, a canonical assistant message. A file that only has `agent_message` still counts.
- Default discovery keeps `rollout-*.jsonl` only. `--path` on a custom directory reads every `.jsonl` except prompt-suggestion files and `history.jsonl`, `session_index.jsonl`, `logs.jsonl`.

### Assumed

- Some builds may put assistant text in a `text` block instead of `output_text`, or in a string body. Both are accepted.
- `agent_message` is a duplicate of the canonical reply when both exist. If a future build puts different text in each, the extra text is kept only when it is not a prefix of the canonical one.
- Compressed rollouts are not read.
- A forked session (`forked_from_id`) is counted in full, including the copied prefix.
- Timestamps may be ISO strings or epoch seconds/milliseconds. Date-only `--compare` values are UTC midnight.

## Detection

With `--agent auto` (the default), the first records pick the parser. `session_meta`, `response_item`, `event_msg`, and `turn_context` vote Codex. `assistant`, `user`, `summary`, and `file-history-snapshot` vote Claude Code. `--agent claude` or `--agent codex` forces one parser. Unknown files are tried with both, and the one that yields more assistant prose is kept. Malformed lines are counted and skipped. They are never printed.
