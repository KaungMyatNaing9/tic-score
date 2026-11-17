# Roadmap

Not built. Listed so the current tool does not pretend to do them.

## Opt-in leaderboard

A scoreboard people can publish to on purpose. It would be the first networked feature. The client would send the score card fields only: counts, phrases, session count, word count, date range, and agent mix. It would still refuse to send prose, paths, or session ids. Default stays fully local. Needs an explicit confirm step, a documented payload, and a way to delete a submission.

## More agents

- Cursor agent transcripts
- Aider
- Gemini CLI
- GitHub Copilot CLI

Each one needs a fixture captured from that tool's current files, not a guessed schema.

## Log fidelity

- Dedup a Codex fork against the parent session it copied (`forked_from_id`), so a branch does not double-count the shared prefix
- Read compressed Codex rollouts, not only plain `rollout-*.jsonl`
- Follow Claude Code compaction the way a reader would, instead of counting the post-compaction summary as extra prose when it restates earlier text
- A tighter split between a short quotation and the agent's own sentence

## Real logs

The parsers were checked against public format notes and the Codex filename source, then against the synthetic fixtures in this repo. They have not been run on a live `~/.claude` or `~/.codex` tree. The next useful check is a local run on a real directory, with the report kept on that machine.
