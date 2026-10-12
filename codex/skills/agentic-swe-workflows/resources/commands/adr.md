---
description: Write an Architecture Decision Record for a specific decision.
argument-hint: "<decision title>"
---

Decision to record:

> $ARGUMENTS

## When to create an ADR

Record one when **any** of these holds — regardless of scope tier:

- Introducing, replacing, or removing an external dependency (library, service, datastore).
- Changing or deleting a contract (API, schema, event) used in **3+ places**.
- Changing data flow or persistence — where state lives, the processing order, how data is passed.
- Adding or relocating an architectural layer / component boundary.
- Committing to one of several viable designs where the choice constrains future work.
- Anything a future engineer would reasonably ask "why was it done this way?" about.

If none apply, it's an implementation detail — capture it in the story or a code comment, not an ADR. Don't write an ADR for a decision with no real alternatives.

Invoke the `architect` subagent to write an ADR. The ADR will be written to `docs/adrs/<NNNN>-<slug>.md` using `${CLAUDE_PLUGIN_ROOT}/templates/adr.tmpl.md`.

The architect will determine the next ADR number by reading existing files in `docs/adrs/`.

The ADR captures: context, decision, alternatives considered (with reasons each was rejected), consequences (positive, negative, neutral), status.

After the ADR is written, link it from the relevant architecture doc if one exists.
