---
description: Plan a database migration, data backfill, or API version transition.
argument-hint: "<migration description>"
---

Migration request:

> $ARGUMENTS

Invoke the `migration-planner` subagent. It will produce `docs/migrations/<slug>.md` using `${CLAUDE_PLUGIN_ROOT}/templates/migration-plan.tmpl.md`.

The plan covers:
- Classification (schema/data/both, online/downtime).
- Affected readers and writers.
- Phased rollout (typically **expand → backfill → migrate reads → contract**).
- Per-phase: steps, verification, rollback, duration, lock impact.
- Risks.

**Do NOT execute the migration.** Produce the plan first; the user reviews and approves before any production change. After approval, the migration may be split into stories via `/story` or `planner`.
