---
description: Stress-test a plan, architecture, or PRD by running the devils-advocate agent against it. Steelman first, then critique.
argument-hint: "<path to doc, or 'this plan'>"
---

Document or plan to challenge:

> $ARGUMENTS

## How to handle this

1. **Resolve the target.** If `$ARGUMENTS` is a path, read the file. If it's "this plan" / "the architecture" / "the current PRD", look for the most recent draft in `docs/architecture/`, `docs/prd/`, or the conversation. If none is obvious, ask the user which doc.

2. **Invoke the `devils-advocate` agent.** Hand it the doc plus the most recent conversation context if relevant.

3. **The agent will:**
   - **Steelman first.** Restate the proposal in its strongest form and ask the user to confirm before attacking. This is a hard gate — no critique until the steelman is acknowledged.
   - **Pre-mortem.** Identify the 2–3 most likely failure modes and what would cause each.
   - **Assumption audit.** List load-bearing assumptions; flag the ones with the weakest evidence.
   - **End with a confidence verdict.** HIGH / MEDIUM / LOW / PIVOT, with the single most important reason.

4. **Don't enact changes from a `/challenge` run.** The output is decision input; the user (or `/implement`, or `architect`) is the one who acts on it.

## When to run this

- Before locking an architecture doc (the design feels right but you can't say why — a structured challenge surfaces what's hiding).
- Before `/implement` on a story whose acceptance criteria you suspect of magical-thinking.
- Before `/ship` on a PR that touched something you weren't sure about.

## What not to do

- Don't dilute the critique by running it on already-shipped work — that's a postmortem, not a challenge. Use `/postmortem` instead.
- Don't run `/challenge` on every doc. It's an investment; spend it where the cost of being wrong is high.
