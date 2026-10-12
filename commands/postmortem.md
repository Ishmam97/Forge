---
description: Produce a blameless postmortem for an incident or significant bug.
argument-hint: "<incident description>"
---

Incident:

> $ARGUMENTS

1. **Root cause first.**
   If root cause isn't already documented, invoke the `debugger` subagent to nail it down. Distinguish proximate from ultimate cause.

2. **Write the postmortem** at `docs/postmortems/<YYYY-MM-DD>-<slug>.md` using `${CLAUDE_PLUGIN_ROOT}/templates/postmortem.tmpl.md`.

3. **Cover:**
   - Summary (two sentences).
   - Impact (duration, affected users, services, SLO/revenue).
   - Timeline (UTC).
   - Root cause: proximate + ultimate.
   - Contributing factors.
   - What went well / what went poorly.
   - Action items (each with owner + due date + tracking issue).

4. **Be blameless.** Describe systems and decisions, not people. If a human action contributed, describe the system that made that action easy or required.

After the postmortem exists, offer to file the action items as issues / stories.
