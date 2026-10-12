# Migration: <Name>

**Status:** Draft | Approved | In Progress | Complete
**Author:** <name>
**Date:** YYYY-MM-DD

## Classification
- **Type:** schema | data | both
- **Mode:** online (no downtime) | requires downtime
- **Estimated total duration:** `<wallclock>`

## Affected systems

**Writers:**
- ...

**Readers:**
- ...

**Batch / async consumers:**
- ...

## Phases

### Phase 1: Expand
**Goal:** Add new structure alongside old.

**Steps:**
1. ...

**Verification:**
- ...

**Rollback:**
- ...

**Estimated duration / lock impact:**

---

### Phase 2: Backfill
**Goal:** Populate new from old.

**Steps:**
1. ...

**Verification:**
- Row counts match.
- Checksum on sample matches.

**Rollback:**
- ...

**Estimated duration:**

---

### Phase 3: Migrate reads
**Goal:** Switch readers to new.

**Steps:**
1. ...

**Verification:**
- ...

**Rollback:**
- Toggle feature flag back.

---

### Phase 4: Contract
**Goal:** Stop writing old, drop after soak.

**Soak period:** `<duration>`

**Steps:**
1. Stop writes to old.
2. Soak.
3. Drop old structure.

**Verification:**
- ...

**Rollback:**
- After drop, this is non-trivial. State the recovery plan explicitly.

## Rollback & recovery

State explicitly what we will and won't be able to recover from at each phase. Don't leave this as "rollback: TBD".

### Recovery objectives
- **RPO (Recovery Point Objective):** Maximum acceptable data loss measured in time (e.g. "5 minutes" — we accept losing up to 5 min of writes).
- **RTO (Recovery Time Objective):** Maximum acceptable downtime to recover (e.g. "30 minutes" — service back within 30 min of incident declaration).

### Per-phase rollback feasibility
| Phase | Reversible without data loss? | Recovery action |
|---|---|---|
| 1 Expand | Yes — drop new structure | `DROP TABLE/COLUMN`; no consumers yet |
| 2 Backfill | Yes — drop new structure | Same as Phase 1 |
| 3 Migrate reads | Yes — flip feature flag | Toggle flag back; readers return to old |
| 4 Contract (pre-drop) | Yes — re-enable writes to old | Re-enable; resume dual-write |
| 4 Contract (post-drop) | **No** — point-in-time restore needed | Restore from snapshot taken before drop |

### Recovery priority order
If something goes wrong mid-migration, recover in this order:

1. **Data integrity** — stop further damage; ensure no writes are being lost.
2. **Read availability** — restore read serving so users see *something* even if stale.
3. **Write availability** — restore writes (may require flipping back to old structure).
4. **Performance** — accept degraded perf during recovery; tune after stable.

### Recovery type taxonomy
Identify which kind of recovery a given failure requires:

- **Data recovery** — restore lost or corrupted rows. Source: backup / replica / source-of-truth log.
- **Service recovery** — restart processes, re-establish connections, drain queues.
- **Infrastructure recovery** — replace failed node, re-provision capacity.
- **Complete-system recovery** — disaster recovery from point-in-time snapshot.

For this migration, the realistic failure modes and the recovery type they map to:
- ...

## Risks
- ...

## Open questions
- [ ] ...
