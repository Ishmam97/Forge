---
description: Produce a project brief from an idea via the analyst agent.
argument-hint: "<idea or context>"
---

Invoke the `analyst` subagent. Pass the user's input as the starting idea:

> $ARGUMENTS

The analyst will:
1. Ask clarifying questions about user, problem, success metric, constraints, non-goals, competitive landscape.
2. Produce a brief at `docs/briefs/<slug>.md` using `${CLAUDE_PLUGIN_ROOT}/templates/brief.tmpl.md`.

Use the `analyst` subagent — don't write the brief yourself.

After the brief exists, summarize it in 3-5 lines and ask the user whether to proceed to `/greenfield:prd`.
