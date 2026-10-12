---
description: Multi-agent review of the current branch — code, security, performance — in parallel.
---

Run a fan-out review of the current branch.

In **parallel** (single message, multiple Agent tool calls), invoke these subagents on the local diff (`git diff <base>...HEAD`):
- `code-reviewer` — correctness, clarity, conventions, error handling.
- `security-auditor` — OWASP-style vulnerabilities, auth/authz, secret handling.
- `perf-auditor` — N+1, hot-path issues, missing indexes.
- `learnings-researcher` — prior lessons/gotchas on the changed files (read-only; surfaces what we've already learned in this area).

These are one axis — **Standards** (does the code meet the bar). If the branch is implementing a story (`docs/stories/<NNN>-<slug>.md`) or the diff otherwise traces to a PRD/brief, also run a second, independent axis — **Spec**: walk the diff against the story's acceptance criteria (or the PRD's functional requirements) and report what's satisfied, partial, or missing. Do not merge the Spec axis into the Standards findings — a change can pass one and fail the other, and collapsing them hides that.

**Deferred-corner check.** Grep the diff for `# scope:` markers (see AGENTS.md § Conventions). Any left in the diff are corners the author flagged as intentionally cut — list each with file:line so the author can confirm it's still acceptable to ship, or convert it to a follow-up story/ADR.

When all return, **aggregate findings into one report grouped by severity**, not by reviewer:

- **[BLOCKER]** / **[CRITICAL]** — must fix before merge.
- **[SHOULD]** / **[HIGH]** — fix or justify.
- **[NIT]** / **[MEDIUM]** / **[LOW]** / **[INFO]** — author discretion.

Cite specific lines for every finding. Note which reviewer surfaced each finding in parentheses (e.g. "(security)"). If `learnings-researcher` surfaced Critical prior lessons, lead the report with a short **Prior lessons** note so they inform the fix. Report the Spec axis and the deferred-corner check as their own sections, not folded into severity buckets — they answer "does this match intent," not "is this well-built."

End with a one-line verdict: ready for PR, or N blockers remaining.
