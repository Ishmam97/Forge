---
description: Capture a lesson as a typed artifact in docs/learnings/ so future sessions can find it. Use when "save this lesson", "/learn", "remember this for next time". Do NOT use for routine session logs or anything already in AGENTS.md / an ADR.
argument-hint: "<one-line topic>"
---

Learning topic:

> $ARGUMENTS

## How to handle this

1. **Decide what's worth saving.** Capture it only if it's **non-obvious** AND **reusable** AND **not already** in `AGENTS.md`, an ADR, a story, or an architecture doc. Fails any one → say so and stop. **Don't manufacture a learning to justify the command.**

2. **Check for overlap first.** Grep `docs/learnings/` for the same `component:` / `tags:`. If a strong match exists, **update that artifact** (bump `date`) instead of creating a near-duplicate. If it's ambiguous, ask the user: update or new?

3. **Pick the track and write the typed artifact.** `bug` (a defect diagnosed and fixed) or `knowledge` (a pattern, convention, or decision). Instantiate `${CLAUDE_PLUGIN_ROOT}/templates/learning.tmpl.md` at `docs/learnings/<YYYY-MM-DD>-<kebab-slug>.md`, filling the frontmatter — `track`, `component`, `tags`, `severity`, and the track-specific fields — from this session's real events: real paths, error messages, commit refs. Under 100 lines.

4. **Discoverability check.** Confirm the project's `AGENTS.md` surfaces `docs/learnings/` (the scaffold's does, via the Knowledge Verification Chain). If a project's doesn't, propose the smallest addition so a fresh session knows the store exists — informational, not imperative ("relevant when working in documented areas", not "always search first", which causes redundant reads).

5. **Cross-link, don't enact.** If the learning implies scaffold edits, list them under "Suggested updates" in the artifact. **Don't make those edits here** — the user decides which become real.

6. **Report:** artifact path, the one-line takeaway, and any suggested updates.

## What not to do

- Don't write a session log dressed as a learning — the artifact is for transferable insight, not narration.
- Don't duplicate an existing learning — update it.
- Don't auto-apply the suggested scaffold updates. Surface them; the user decides.
