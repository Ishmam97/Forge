---
description: Propose and apply a refactor (behavior-preserving change).
argument-hint: "<area or file to refactor>"
---

Refactor target:

> $ARGUMENTS

1. **Read the target code.** Look for duplication, unclear naming, dead code, leaky abstractions, missing tests.

2. **Propose a refactor plan** as a numbered list of small steps. Each step must keep tests green on its own. Show the plan to the user.

3. **Wait for green light.** Do not start the refactor unless the user confirms.

4. **Execute — `refactorer` subagent.**
   Invoke `refactorer` to do the work, one step at a time. Run tests after each step. If a step is risky and the target has weak test coverage, the refactorer will write characterization tests first.

5. **Report.** Diff summary, test status. Offer `/review` before PR.
