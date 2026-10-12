# Runbook: <one-line procedure name>

**Owner:** <team or person>
**Last verified:** YYYY-MM-DD by `<name>` — running through the steps end-to-end.
**Frequency:** ad-hoc | weekly | monthly | on alert `<alert name>` | on incident `<sev>`

## Purpose

One paragraph. What this runbook accomplishes, and the trigger that causes someone to open it. If a reader can't tell within 20 seconds whether they're in the right place, rewrite the purpose.

## When NOT to use this runbook

If any of these are true, **stop and escalate** rather than proceed:

- ...
- ...

## Prerequisites

What the operator needs before starting. Each line is a hard requirement; if any is missing, the runbook will fail mid-execution.

- **Access:** `<role / group / SSO>`
- **Tools:** `<CLI name>`, version `<x>`
- **Credentials:** `<which secrets, where they live>`
- **Context:** `<links to dashboards, recent commits, related incidents>`

## Steps

Numbered, atomic, copy-paste-runnable. After each step state the **expected output** so the operator can verify before proceeding.

1. **`<verb the action>`**

   ```bash
   <exact command>
   ```

   **Expected output:** `<one line describing what success looks like>`

   **If you see X instead:** `<what to do — usually a jump to Troubleshooting>`

2. **`<verb the action>`**

   ```bash
   <exact command>
   ```

   **Expected output:** ...

3. ...

## Troubleshooting

Symptoms a runner is likely to see, in order of frequency. Don't list every theoretical failure — list the ones that actually happen.

### `<symptom>`

- **Cause:** ...
- **Fix:** ...

### `<symptom>`

- **Cause:** ...
- **Fix:** ...

## Cleanup / verification

Even on success, leave the system in a known state.

- [ ] `<verification step>` — what to check to be sure the procedure succeeded.
- [ ] `<cleanup step>` — temp files removed, debug flags reset, alerts re-enabled.
- [ ] Log the run (where applicable): `<where to record date/operator/outcome>`.

## Related

- Related runbook: `docs/runbooks/<other>.md`
- Related architecture section: `docs/architecture/<slug>.md#<section>`
- Recent incident this runbook addresses: `docs/postmortems/<date>-<slug>.md`
