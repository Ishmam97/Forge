---
description: Create a single story file with full context for implementation.
argument-hint: "<story description>"
---

Story request:

> $ARGUMENTS

Invoke the `planner` subagent for a single story. The planner will:
1. Read the relevant PRD (`docs/prd/`) and architecture doc (`docs/architecture/`).
2. Identify affected files from `REPOMAP.md` (brownfield) or the scaffold (greenfield).
3. Write `docs/stories/<NNN>-<slug>.md` using `${CLAUDE_PLUGIN_ROOT}/templates/story.tmpl.md`.

The planner picks the next story number by reading existing files in `docs/stories/` and incrementing.

After the story exists, summarize it in 3-5 lines and offer `/implement <NNN>`.
