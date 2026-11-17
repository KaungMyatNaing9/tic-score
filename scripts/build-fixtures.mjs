import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "fixtures");

function line(value) {
  return `${JSON.stringify(value)}\n`;
}

const edge = [
  line({
    type: "system",
    subtype: "synthetic-fixture",
    note: "SYNTHETIC fixture for tic-score tests. Not a real session.",
  }),
  line({
    type: "user",
    timestamp: "2026-01-10T12:00:00.000Z",
    uuid: "edge-user",
    message: {
      role: "user",
      content:
        "Please review the parser. CANARY_USER_SECRET_q7 You're absolutely right that this is a vibrant idea.",
    },
  }),
  line({
    type: "assistant",
    timestamp: "2026-01-10T12:00:02.000Z",
    uuid: "edge-a1",
    message: {
      role: "assistant",
      id: "msg_edge_1",
      content: [
        {
          type: "text",
          text: "You're absolutely right. The parser drops the second block. Let me trace the offset. The offset is load-bearing for the index. The quark latch holds.",
        },
        {
          type: "tool_use",
          id: "tool_edge",
          name: "Read",
          input: { file: "src/parser.ts", note: "load-bearing CANARY_TOOL_INPUT_q7 nestled" },
        },
      ],
    },
  }),
  line({
    type: "user",
    timestamp: "2026-01-10T12:00:03.000Z",
    uuid: "edge-tool",
    message: {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: "tool_edge",
          content: "multifaceted CANARY_TOOL_OUTPUT_q7 load-bearing robust delve",
        },
      ],
    },
    toolUseResult: { status: "ok" },
  }),
  line({
    type: "assistant",
    timestamp: "2026-01-10T12:00:08.000Z",
    uuid: "edge-a2",
    message: {
      role: "assistant",
      id: "msg_edge_2",
      content: [
        { type: "thinking", thinking: "pivotal CANARY_THINKING_q7 load-bearing" },
        {
          type: "text",
          text: [
            "Great question. A second look — just one — shows the branch is unused.",
            "",
            "```ts",
            "// CANARY_CODEBLOCK_q7",
            'const phrase = "load-bearing";',
            'const mood = "nestled";',
            "```",
            "",
            "Quoted file contents follow.",
            "",
            '<file path="src/parser.ts">',
            'export const area = "realm";',
            "// CANARY_FILEQUOTE_q7",
            "load-bearing",
            "</file>",
            "",
            "The comment is not a tic. CANARY_PROSE_q7 is in the note.",
            "",
            "12| const label = \"load-bearing\";",
            "13| const mood = \"nestled\";",
            "",
            "    const hidden = \"load-bearing\";",
            "    function skip() { return 1; }",
            "",
            "diff --git a/src/index.ts b/src/index.ts",
            "--- a/src/index.ts",
            "+++ b/src/index.ts",
            "@@ -1,2 +1,2 @@",
            '-const old = "load-bearing";',
            '+const next = "load-bearing";',
          ].join("\n"),
        },
      ],
    },
  }),
  line({
    type: "assistant",
    message: {
      role: "assistant",
      content: "A dateless aside says nothing special about the offset.",
    },
  }),
  line({ type: "summary", summary: "tapestry load-bearing should not count", leafUuid: "edge-a2" }),
  line({ type: "progress", data: { message: "tapestry" } }),
  line({ type: "file-history-snapshot", snapshot: { files: [] } }),
  "{this is not json\n",
].join("");

const stream = [
  line({
    type: "assistant",
    timestamp: "2026-02-10T09:00:00.000Z",
    message: { role: "assistant", id: "msg_snap", content: [{ type: "text", text: "Let me check the index." }] },
  }),
  line({
    type: "assistant",
    timestamp: "2026-02-10T09:00:01.000Z",
    message: {
      role: "assistant",
      id: "msg_snap",
      content: [
        {
          type: "text",
          text: "Let me check the index. The cache is load-bearing here. The quark latch returns.",
        },
      ],
    },
  }),
  line({
    type: "assistant",
    timestamp: "2026-02-10T09:00:02.000Z",
    message: {
      role: "assistant",
      id: "msg_delta",
      content: [{ type: "text", text: "You're absolutely correct." }],
    },
  }),
  line({
    type: "assistant",
    timestamp: "2026-02-10T09:00:03.000Z",
    message: {
      role: "assistant",
      id: "msg_delta",
      content: [{ type: "text", text: "The retry loop is the bug." }],
    },
  }),
].join("");

const rewind = [
  line({
    type: "user",
    uuid: "u1",
    parentUuid: null,
    timestamp: "2026-01-01T00:00:00.000Z",
    message: { role: "user", content: "go" },
  }),
  line({
    type: "assistant",
    uuid: "u2",
    parentUuid: "u1",
    timestamp: "2026-01-02T00:00:00.000Z",
    message: { role: "assistant", id: "msg_u2", content: [{ type: "text", text: "The active path is fine." }] },
  }),
  line({
    type: "assistant",
    uuid: "u3",
    parentUuid: "u2",
    timestamp: "2026-01-03T00:00:00.000Z",
    message: {
      role: "assistant",
      id: "msg_u3",
      content: [{ type: "text", text: "A quiet ending stays quiet." }],
    },
  }),
  line({
    type: "assistant",
    uuid: "u9",
    parentUuid: "u1",
    timestamp: "2026-01-02T12:00:00.000Z",
    message: {
      role: "assistant",
      id: "msg_u9",
      content: [
        { type: "text", text: "This abandoned branch is a tapestry of excuses. It is also load-bearing." },
      ],
    },
  }),
].join("");

const chattyTexts = [
  "You're absolutely right. The index is load-bearing for the lookup, and the second copy is load-bearing for the rebuild.",
  "Great question. The quark latch holds the generation counter. The quark latch is checked on every write, and the quark latch should stay explicit.",
  "Let me walk one read. Let me leave the unused branch on disk. Let me keep the name stable.",
  "You're absolutely right about the empty input. The helper is robust enough for empty input. I would not call the helper robust yet, and the retry is robust only because the test pins it.",
  "Great question. The offset math is the bug, and the fix is a bounds check before the write.",
  "Let me know if the snapshot test should include the header. I hope this helps with the review.",
  "A deep dive is not needed. Moving forward, the seam is the contract. We should not call it seamless, and it is not a game-changer.",
  "The old path — the one from January — still parses, and the new path — shorter — does too. Keep the name — index — and the counter — generation — together.",
  "I will not delve into the scheduler. No need to delve further. That explanation is hand-waving. Here's the thing. Skip the honest framing.",
  "Call the map load-bearing, the counter load-bearing, and the header load-bearing. The checksum is load-bearing too. So is the slot table, which is load-bearing, and the free list, which is load-bearing. The lock is load-bearing. The watermark is load-bearing. The cursor is load-bearing. The tail is load-bearing.",
];

let chatty = "";
chatty += line({
  type: "user",
  timestamp: "2026-01-20T15:00:00.000Z",
  uuid: "c-user",
  message: {
    role: "user",
    content: "Look at the index. You're absolutely right it feels vibrant. CANARY_USER_SECRET_q7",
  },
});
chattyTexts.forEach((text, index) => {
  const stamp = new Date(Date.UTC(2026, 0, 20, 15, index, 0)).toISOString();
  chatty += line({
    type: "assistant",
    timestamp: stamp,
    uuid: `c-a-${index}`,
    parentUuid: index === 0 ? "c-user" : `c-a-${index - 1}`,
    message: {
      role: "assistant",
      id: `msg_chatty_${index}`,
      content: [
        { type: "text", text },
        {
          type: "tool_use",
          id: `tool_chatty_${index}`,
          name: "Read",
          input: { query: "load-bearing CANARY_TOOL_INPUT_q7" },
        },
      ],
    },
  });
  chatty += line({
    type: "user",
    timestamp: stamp,
    uuid: `c-t-${index}`,
    parentUuid: `c-a-${index}`,
    message: {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: `tool_chatty_${index}`,
          content: "multifaceted CANARY_TOOL_OUTPUT_q7 load-bearing",
        },
      ],
    },
  });
});

const subagent = line({
  type: "assistant",
  timestamp: "2026-05-01T00:00:00.000Z",
  isSidechain: true,
  message: {
    role: "assistant",
    id: "msg_side",
    content: [{ type: "text", text: "The sidechain does delve into the log once." }],
  },
});

const promptSuggestion = line({
  type: "assistant",
  timestamp: "2026-01-20T00:00:00.000Z",
  message: {
    role: "assistant",
    content: [
      {
        type: "text",
        text: "promptsuggestiononlyphrase ".repeat(5) + "load-bearing ".repeat(40) + "tapestry",
      },
    ],
  },
});

function codex(type, payload, timestamp) {
  return line({ timestamp, type, payload });
}

const codexMain = [
  codex(
    "session_meta",
    {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      cwd: "/tmp/synthetic-widget",
      cli_version: "0.130.0",
      model_provider: "openai",
      thread_source: "user",
    },
    "2026-03-02T15:04:05.000Z",
  ),
  codex("turn_context", { cwd: "/tmp/synthetic-widget", model: "gpt-5.1" }, "2026-03-02T15:04:05.000Z"),
  codex(
    "response_item",
    {
      type: "message",
      role: "developer",
      content: [{ type: "input_text", text: "You are a coding agent. Say load-bearing often. CANARY_DEV_q7 realm" }],
    },
    "2026-03-02T15:04:05.000Z",
  ),
  codex(
    "response_item",
    {
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: "Fix the bug. You're absolutely right CANARY_USER_SECRET_q7 vibrant",
        },
      ],
    },
    "2026-03-02T15:04:06.000Z",
  ),
  codex(
    "event_msg",
    { type: "user_message", message: "Fix the bug. You're absolutely right CANARY_USER_SECRET_q7 vibrant" },
    "2026-03-02T15:04:06.000Z",
  ),
  codex(
    "response_item",
    { type: "reasoning", summary: [{ type: "summary_text", text: "pivotal CANARY_REASONING_q7 load-bearing" }] },
    "2026-03-02T15:04:07.000Z",
  ),
  codex(
    "response_item",
    {
      type: "function_call",
      name: "shell",
      arguments: JSON.stringify({ command: "echo load-bearing CANARY_TOOL_INPUT_q7" }),
      call_id: "call_1",
    },
    "2026-03-02T15:04:07.000Z",
  ),
  codex(
    "response_item",
    {
      type: "function_call_output",
      call_id: "call_1",
      output: "multifaceted CANARY_TOOL_OUTPUT_q7 load-bearing robust",
    },
    "2026-03-02T15:04:08.000Z",
  ),
  codex(
    "event_msg",
    { type: "exec_command_end", call_id: "call_1", exit_code: 0, stdout: "CANARY_TOOL_OUTPUT_q7 load-bearing" },
    "2026-03-02T15:04:08.000Z",
  ),
  codex(
    "response_item",
    {
      type: "message",
      role: "assistant",
      content: [
        {
          type: "output_text",
          text: "You're absolutely right. The shell wrapper is load-bearing. The quark latch shows up here. The quark latch is named once more.\n\n```bash\necho load-bearing CANARY_CODEBLOCK_q7\n```\n\nI will leave the script alone.",
        },
      ],
    },
    "2026-03-02T15:05:00.000Z",
  ),
  codex(
    "event_msg",
    {
      type: "agent_message",
      message:
        "You're absolutely right. The shell wrapper is load-bearing. The quark latch shows up here. The quark latch is named once more.\n\n```bash\necho load-bearing CANARY_CODEBLOCK_q7\n```\n\nI will leave the script alone.",
    },
    "2026-03-02T15:05:00.000Z",
  ),
  codex(
    "event_msg",
    {
      type: "task_complete",
      last_agent_message: "You're absolutely right. The shell wrapper is load-bearing.",
    },
    "2026-03-02T15:05:01.000Z",
  ),
  codex("event_msg", { type: "token_count", info: { total_tokens: 10 } }, "2026-03-02T15:05:01.000Z"),
  "not json at all\n",
  codex(
    "response_item",
    { type: "message", role: "assistant", content: "Legacy string content says cutting-edge once." },
    "2026-03-02T15:06:00.000Z",
  ),
  codex(
    "response_item",
    {
      type: "custom_tool_call",
      name: "apply_patch",
      input: "load-bearing CANARY_TOOL_INPUT_q7",
      call_id: "call_2",
    },
    "2026-03-02T15:06:01.000Z",
  ),
].join("");

const fallback = [
  codex(
    "session_meta",
    { id: "fallback-session", cwd: "/tmp/synthetic-widget", cli_version: "0.130.0" },
    "2026-03-11T00:00:00.000Z",
  ),
  codex(
    "event_msg",
    { type: "agent_message", message: "Please circle back only in this fallback message." },
    "2026-03-11T00:00:02.000Z",
  ),
  codex(
    "event_msg",
    { type: "task_complete", last_agent_message: "Please circle back only in this fallback message." },
    "2026-03-11T00:00:03.000Z",
  ),
].join("");

const zephyr = [
  "The zephyr widget blinks.",
  "The zephyr widget blinks again.",
  "A zephyr widget sits on the desk.",
  "Another zephyr widget waits.",
  "The zephyr widget is a topic, not a habit.",
  "One zephyr widget is enough.",
  "This zephyr widget stays in a single note.",
  "The last zephyr widget closes the note.",
].join(" ");

const topic = [
  codex(
    "session_meta",
    { id: "topic-session", cwd: "/tmp/synthetic-widget", cli_version: "0.130.0" },
    "2026-03-10T00:00:00.000Z",
  ),
  codex(
    "response_item",
    { type: "message", role: "assistant", content: [{ type: "output_text", text: zephyr }] },
    "2026-03-10T00:01:00.000Z",
  ),
].join("");

const archived = [
  codex(
    "session_meta",
    { id: "archived-session", cwd: "/tmp/synthetic-widget", cli_version: "0.130.0" },
    "2026-06-01T00:00:00.000Z",
  ),
  codex(
    "response_item",
    {
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text: "After the fix, the note does delve into naming only." }],
    },
    "2026-06-01T00:02:00.000Z",
  ),
].join("");

const moreover = [
  codex(
    "session_meta",
    { id: "reverted-session", cwd: "/tmp/synthetic-widget", cli_version: "0.130.0" },
    "2026-02-02T10:00:00.000Z",
  ),
  codex(
    "response_item",
    {
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text: "Moreover, the filename still parses." }],
    },
    "2026-02-02T10:00:05.000Z",
  ),
].join("");

function plainProse(sentences) {
  const adjectives = [
    "small", "old", "young", "early", "long", "short", "high", "low", "open", "local",
    "public", "simple", "warm", "cold", "dark", "full", "daily", "common", "single", "whole",
    "main", "final", "quiet", "bright", "narrow", "wide", "round", "flat", "fresh",
    "busy", "calm", "loud", "soft", "quick", "slow", "heavy",
  ];
  const nouns = [
    "room", "door", "window", "paper", "letter", "morning", "evening", "winter", "summer",
    "city", "town", "house", "tree", "bird", "horse", "family", "friend", "story", "music",
    "water", "night", "week", "month", "year", "boat", "road", "cloud", "rain", "snow",
    "wind", "book", "chair", "cup", "bowl", "lamp", "coat", "shoe", "bell", "clock",
  ];
  const verbs = [
    "stands", "turns", "looks", "seems", "starts", "ends", "works",
    "gives", "takes", "leaves", "brings", "finds", "covers", "marks",
  ];
  const places = [
    "street", "river", "field", "garden", "bridge", "market", "school", "hill", "shore",
    "station", "corner", "square", "park", "lane", "yard", "harbor", "valley", "pond",
  ];
  const out = [];
  for (let i = 0; i < adjectives.length && out.length < sentences; i += 1) {
    for (let j = 0; j < nouns.length && out.length < sentences; j += 1) {
      const verb = verbs[(i + j) % verbs.length];
      const place = places[(i * 3 + j) % places.length];
      const other = nouns[(j + 11) % nouns.length];
      out.push(
        `The ${adjectives[i]} ${nouns[j]} ${verb} on the ${place} with a ${other}.`,
      );
    }
  }
  return out.join(" ");
}

const beforeFiller = line({
  type: "assistant",
  timestamp: "2026-03-18T12:00:00.000Z",
  uuid: "filler-before",
  message: {
    role: "assistant",
    id: "msg_filler_before",
    content: [{ type: "text", text: plainProse(280) }],
  },
});

const afterFiller = [
  codex(
    "session_meta",
    { id: "quiet-after", cwd: "/tmp/synthetic-widget", cli_version: "0.130.0" },
    "2026-05-20T12:00:00.000Z",
  ),
  codex(
    "response_item",
    {
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text: plainProse(420) }],
    },
    "2026-05-20T12:05:00.000Z",
  ),
].join("");

const history = `${"load-bearing ".repeat(30)}\n`;
const notes = `${"load-bearing ".repeat(20)}\n`;

const files = {
  "claude/edge.jsonl": edge,
  "claude/stream.jsonl": stream,
  "claude/rewind.jsonl": rewind,
  "claude/filler-before.jsonl": beforeFiller,
  "claude/empty.jsonl": "",
  "claude/weird.jsonl": "[]\n\"hello\"\n{\n",
  "claude/projects/-tmp-synthetic-widget/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jsonl": chatty,
  "claude/projects/-tmp-synthetic-widget/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/subagents/agent-a123.jsonl":
    subagent,
  "claude/projects/-tmp-synthetic-widget/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/subagents/agent-aprompt_suggestion-xyz.jsonl":
    promptSuggestion,
  "codex/sessions/2026/03/02/rollout-2026-03-02T15-04-05-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jsonl":
    codexMain,
  "codex/sessions/2026/03/11/rollout-2026-03-11T00-00-00-eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.jsonl":
    fallback,
  "codex/sessions/2026/03/10/rollout-2026-03-10T00-00-00-ffffffff-ffff-4fff-8fff-ffffffffffff.jsonl":
    topic,
  "codex/sessions/2026/02/02/rollout-2026-02-02T10-00-00-cccccccc-cccc-4ccc-8ccc-cccccccccccc_dddddddd-dddd-4ddd-8ddd-dddddddddddd.jsonl":
    moreover,
  "codex/archived_sessions/2026/06/01/rollout-2026-06-01T00-00-00-99999999-9999-4999-8999-999999999999.jsonl":
    archived,
  "codex/sessions/2026/05/20/rollout-2026-05-20T12-00-00-12121212-1212-4121-8121-121212121212.jsonl":
    afterFiller,
  "codex/sessions/history.jsonl": history,
  "notes.txt": notes,
  "SYNTHETIC.txt":
    "SYNTHETIC FIXTURES\n\nThese logs were written for tic-score tests. They are not real Claude Code or Codex sessions. Do not treat any card rendered from this directory as a real agent's score.\n",
};

for (const [rel, body] of Object.entries(files)) {
  const file = path.join(root, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
}
console.log(`wrote ${Object.keys(files).length} fixture files`);
