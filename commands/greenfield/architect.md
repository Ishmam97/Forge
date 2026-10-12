---
description: Produce an architecture document for a feature or project.
argument-hint: "<PRD slug or topic>"
---

Invoke the `architect` subagent. Context:

> $ARGUMENTS

The `architect` will:
1. Read `docs/prd/<slug>.md` if a PRD exists.
2. Read `REPOMAP.md` if this is brownfield work.
3. Produce `docs/architecture/<slug>.md` using `${CLAUDE_PLUGIN_ROOT}/templates/architecture.tmpl.md`.

If a major technology choice is unresolved, the architect may invoke the `tech-researcher` subagent.

After the architecture exists, summarize the components/data flow/tech choices in 5-7 lines and ask the user whether to proceed to story planning (`planner` agent or `/story`).
