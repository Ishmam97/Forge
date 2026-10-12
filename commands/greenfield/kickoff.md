---
description: Kick off a new project from a one-line idea. Runs analyst → PM → architect → planner → scaffold proposal, with user checkpoints between steps.
argument-hint: "<idea>"
---

The user wants to start a new project from this idea:

> $ARGUMENTS

Run the greenfield kickoff sequence with **checkpoints between every step**. The user can redirect at any point. Do NOT run all five steps in one go.

1. **Discovery — `analyst` subagent.**
   Invoke `analyst` with the idea. It will ask clarifying questions, then write `docs/briefs/<slug>.md`. Wait for the brief; summarize it in 3-5 lines; confirm with the user before continuing.

2. **PRD — `pm` subagent.**
   Once the brief is approved, invoke `pm`. It reads the brief and writes `docs/prd/<slug>.md`. Summarize and checkpoint.

3. **Architecture — `architect` subagent.**
   Once the PRD is approved, invoke `architect`. It writes `docs/architecture/<slug>.md`. Summarize and checkpoint.

4. **Stories — `planner` subagent.**
   Once the architecture is approved, invoke `planner`. It writes story files to `docs/stories/<NNN>-<slug>.md` in dependency order. Show the story list and checkpoint.

5. **Scaffold proposal.**
   Read the architecture doc; propose the initial project skeleton (directory layout, key config files, entry points, test setup). Do NOT create files yet — confirm the shape with the user, then run `/greenfield:scaffold <slug>`.

After scaffolding, offer to run `/implement <first-story>`.

