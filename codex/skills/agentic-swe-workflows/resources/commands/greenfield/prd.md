---
description: Produce a PRD from an existing brief (or a clear request).
argument-hint: "<brief slug or topic>"
---

Invoke the `pm` subagent. Context:

> $ARGUMENTS

The `pm` will:
1. Read the brief at `docs/briefs/<slug>.md` if one exists.
2. Produce `docs/prd/<slug>.md` using `${CLAUDE_PLUGIN_ROOT}/templates/prd.tmpl.md`.

If no brief exists and the request is vague, ask the user to confirm scope explicitly or run `/greenfield:brief` first.

After the PRD exists, summarize it and ask the user whether to proceed to `/greenfield:architect`.
