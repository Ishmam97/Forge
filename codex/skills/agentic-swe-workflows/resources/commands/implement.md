---
description: Implement a story using the architect→editor split.
argument-hint: "<story file path or NNN>"
---

Story to implement:

> $ARGUMENTS

Run the architect→editor pipeline:

0. **Recall prior lessons — `learnings-researcher` subagent.**
   Before planning, invoke `learnings-researcher` on the story's area. Hand any Critical/Relevant findings to the architect step so the plan accounts for known gotchas instead of re-discovering them.

1. **Architect step — `architect` subagent.**
   Read the story file at `docs/stories/<NNN>-<slug>.md`. Invoke `architect` (or think hard yourself if the story is small) to produce a concrete *implementation plan*: which files change, in what order, what each change does, what tests to add. **Do not write code in this step.**

2. **Confirm with user.** Show the plan. Wait for green light. The user can redirect — they may see context the plan missed.

3. **Editor step — `implementer` subagent.**
   Invoke `implementer`. Hand it the story file plus the plan. The implementer applies the diffs, runs formatters and tests.

4. **Tests — `test-author` subagent (if needed).**
   If the plan called for new tests and the implementer didn't write them, invoke `test-author`.

5. **Self-check.** Run `/review` on the local diff before declaring done.

Report: files changed, tests passing, which acceptance criteria are now met (or still open).
