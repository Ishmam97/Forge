# Incident: <one-line summary>

**Severity:** S1 | S2 | S3 | S4 (see matrix below)
**Status:** Investigating | Identified | Mitigating | Monitoring | Resolved
**Declared:** YYYY-MM-DD HH:MM <timezone>
**Resolved:** (when applicable)
**Commander:** <name>
**Comms:** <name>
**Tech lead:** <name>
**Scribe:** <name>
**Customer liaison:** (S1/S2 only) <name>

> This is the **live incident document**. Update in place as the event unfolds. Once resolved, run `/postmortem` to produce the retrospective. This file stays as the contemporaneous record.

## Severity matrix

| Sev | Definition | Response target | Examples |
|---|---|---|---|
| **S1** | Customer-facing outage; data loss; security breach | Page on-call immediately; commander within 5 min | Service fully down; PII exposed; payment processing broken |
| **S2** | Major degradation; subset of customers affected; no workaround | Page on-call; commander within 15 min | One region down; auth slow for >5% users; key feature broken |
| **S3** | Minor degradation; workaround exists; no customer-data risk | Engage during business hours | Background job lagging; non-critical alert noise; slow admin tool |
| **S4** | Internal-only; no customer impact | Track as a normal bug | Staging is broken; metrics dashboard missing a panel |

## Impact

- **Users affected:** (count, %, segment if known)
- **Functionality affected:** (which features, which paths)
- **Revenue/SLO impact:** (if known)
- **Started:** (when impact began, not when noticed)

## Timeline

Append-only. UTC timestamps. Update as events happen — don't backfill.

| Time | What happened | Actor |
|---|---|---|
| HH:MM | Alert fired: `<alert name>` | system |
| HH:MM | Engineer paged, ack | `<name>` |
| HH:MM | First diagnosis: `<one line>` | `<name>` |
| HH:MM | Mitigation deployed: `<one line>` | `<name>` |

## Current hypothesis

What we currently think is happening. Update this each time the hypothesis changes; old ones go into "Hypotheses ruled out".

> Current: `<one or two sentences>`

### Hypotheses ruled out
- `<hypothesis>` — ruled out because `<evidence>` at HH:MM.

## Mitigation in progress

- [ ] `<step>` — owner, ETA
- [ ] `<step>` — owner, ETA

## Communication log

Track external messages here. Customer-facing copy templates below.

| Time | Channel | Message summary |
|---|---|---|
| HH:MM | status page | initial declaration |
| HH:MM | status page | update — see template below |

### Initial declaration (status page / customer email)

> We're investigating reports of `<observable issue>`. Customers may experience `<concrete user-facing effect>`. We'll post an update by `<time>`.

### Status update

> **Update HH:MM <tz>:** We have identified the cause as `<one sentence, no jargon>`. Mitigation is `<in progress | deployed>`. Next update at `<time>`.

### Resolution

> **Resolved HH:MM <tz>:** The issue affecting `<thing>` has been resolved. Customers should now see `<expected normal behavior>`. A postmortem will be published within `<timeframe>`.

## Post-resolution

Once `Status:` flips to Resolved, the next steps are:

1. Run `/postmortem` to create `docs/postmortems/<YYYY-MM-DD>-<slug>.md`. The postmortem references this incident file as the source of truth for the timeline.
2. File follow-up issues from the "Mitigation in progress" list above.
3. Do not delete or rewrite this file. The contemporaneous record is the value.
