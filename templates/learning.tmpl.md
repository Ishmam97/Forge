---
track: bug                  # bug | knowledge
title: <one-line takeaway>
date: YYYY-MM-DD
component: <subsystem/area — reuse existing values: auth, build, ci, data, api, ...>
tags: [<kebab>, <kebab>]    # searchable keywords; reuse before inventing
severity: medium            # low | medium | high — how much this bites
# --- bug track only (delete this block for knowledge track) ---
problem_type: logic         # logic | config | dependency | race | integration | performance | tooling | environment
symptoms: <the observable failure — how it shows up>
root_cause: <the actual cause, not the symptom>
resolution: <what fixed it>
# --- knowledge track only (use instead of the bug block) ---
# applies_when: [<situation where this guidance is relevant>, ...]
---

# <one-line takeaway>

## What happened
2–4 sentences: the concrete situation — what was tried, what surprised, the resolution. Link real files, commits, error messages.

## What I learned
The transferable rule or heuristic a future session can act on. **One paragraph max.** If you can't compress it, you haven't extracted the lesson — you're still narrating.

## Signals — how to spot this next time
- ...
- ...

## Suggested updates (do not auto-apply)
Where this should propagate into the scaffold. Name specific edits; the user decides which become real.
- `CLAUDE.md` — `<proposed addition>`
- `.claude/agents/<name>.md` — `<proposed addition>`
- `templates/<name>.tmpl.md` — `<proposed addition>`

## Related
- ADR: `docs/adrs/<NNNN>-<slug>.md` (if relevant)
- Story / postmortem: `docs/...`
- Other learnings: `docs/learnings/<date>-<slug>.md`
