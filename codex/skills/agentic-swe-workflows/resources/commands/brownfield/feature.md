---
description: Add a new feature to an existing repo. Runs PRD → architecture delta → stories.
argument-hint: "<feature description>"
---

Feature request:

> $ARGUMENTS

**Prerequisite:** If `REPOMAP.md` doesn't exist at the repo root, run `/brownfield:onboard` first and stop. The repo map is required before brownfield feature work.

If `REPOMAP.md` exists, proceed with checkpoints between steps:

1. **PRD — `pm` subagent.**
   Invoke `pm` to produce `docs/prd/<feature-slug>.md`. The PRD should reference existing system context from `REPOMAP.md`. Checkpoint.

2. **Architecture delta — `architect` subagent.**
   Invoke `architect` to produce `docs/architecture/<feature-slug>.md`. This is a *delta* — describe how the feature plugs into the existing architecture, not the whole system. Checkpoint.

3. **Stories — `planner` subagent.**
   Invoke `planner` to produce story files in `docs/stories/`. Show the list and checkpoint.

4. **Offer to run `/implement` on the first story.**
