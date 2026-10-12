## Summary
- <1-3 bullets, the headline>

## What changed
- ...

## Why
Brief context. Link to story / issue / PRD.

## Test plan
- [ ] ...
- [ ] ...

## Risk and rollback
- **Risk:** what could go wrong
- **Rollback:** how to back out

## Post-deploy validation
- **Signals to watch:** logs / metrics / dashboards that confirm health after deploy
- **Failure signals:** what "this went wrong" looks like (error rate, latency, specific log line)
- **Rollback trigger:** the concrete condition that means roll back
- **Validation window / owner:** how long to watch, who watches
- _(If there is genuinely no production impact, state that in one line and keep the section.)_

## Linked
- Story: `docs/stories/NNN-...`
- Issue: #...
