---
name: systematic-debugging
description: Find the root cause before proposing any fix — reproduce, read the error whole, hypothesize, falsify, trace to source. Use when "this is broken", "X is failing", "why does Y happen", a stack trace, or a flaky test — and as the discipline the `debugger` agent and `/brownfield:bugfix` follow. Do NOT use for greenfield design questions or for writing new features.
---

# Systematic Debugging

Random fixes waste time and breed new bugs. A symptom patch leaves the cause live. This is the discipline behind the `debugger` agent and `/brownfield:bugfix`.

## The Iron Law

```
NO FIX WITHOUT A REPRODUCTION AND A NAMED ROOT CAUSE FIRST
```

## The hard stop

Evidence and fix are separate phases with a wall between them. **You may not decide on a fix until the root cause is named with evidence.** "I see the problem, let me fix it" — seeing a symptom is not understanding the cause. If you're typing a fix and can't point to the evidence that names the cause, stop and go back to Phase 1.

## The four phases (complete each before the next)

**1 — Investigate.**
- Read the error end to end: stack trace, logs, exit code, surrounding code. The cause is usually in what you skipped.
- Reproduce reliably. No repro → gather more data; do not guess.
- Check recent changes (`git diff`, recent commits, new deps, config/env differences).
- **Multi-component systems:** instrument each boundary before theorizing — log what enters and exits each component, and verify config/env propagation. Run once to see *where* it breaks, then investigate that component. (Don't theorize across five layers; measure.)
- Trace the bad value back to its origin, not the point where it blew up — see [root-cause-tracing](resources/root-cause-tracing.md).

**2 — Pattern.** Find working code near the broken code. List every difference, however small ("that can't matter" is where bugs hide). Read any reference implementation completely before assuming you match it.

**3 — Hypothesis.** State one explicit hypothesis: "the cause is X because Y." Test it with the **smallest** probe — one variable at a time. Falsify, don't just confirm. Wrong? Form a new hypothesis; don't pile fixes on top. Don't know? Say so (Knowledge Verification Chain: codebase → docs → Context7 → web → ask).

**4 — Fix.** Only once the cause is named:
- Write a failing test first that reproduces the symptom (use the [test-driven-development](../test-driven-development/SKILL.md) skill; verify it fails on old code).
- One change addressing the cause. No "while I'm here" cleanup.
- Verify: the test passes, nothing else broke, the original symptom is gone.
- Consider [defense-in-depth](resources/defense-in-depth.md): validate at every layer so the bug becomes structurally impossible, not just patched at one point.

## 3+ fixes failed → question the architecture

If three attempts failed, or each fix surfaces a new problem elsewhere, stop fixing. That's not a failed hypothesis — it's a wrong structure. Surface it to the user and discuss the design before a fourth attempt.

## Common rationalizations

| Rationalization | Reality |
|---|---|
| "Quick patch now, investigate later" | The first fix sets the pattern. Do it right from the start. |
| "It's probably a race condition" | "Probably" is a guess. Instrument and prove it. |
| "Can't reproduce, so I'll fix what I suspect" | A fix you can't verify isn't a fix. Reproduce first. |
| "Just wrap it in try/catch" | Swallowing the error destroys the evidence. Errors are data. |
| "Emergency — no time for process" | Systematic is *faster* than guess-and-check thrashing. |
| "Simple bug, skip the process" | Simple bugs have root causes too; the process is quick for them. |
| "One more fix attempt" (after 2+) | 3+ failures = architectural problem. Stop and question it. |

## Red flags — stop and return to Phase 1

Proposing a fix before tracing data flow · "let me just try changing X" · bundling several changes then running tests · "skip the test, I'll check by hand" · listing fixes before any investigation · adding a fix on top of a failed one.

## Scaffold integration

- The `debugger` agent runs this discipline.
- `/brownfield:bugfix` invokes `debugger` first, then a minimum-change fix + regression test — this skill is its method.
- The regression test is the [TDD](../test-driven-development/SKILL.md) red-green check; "fixed" is a claim that needs Rule 12 evidence, not a feeling.

## Technique resources (load on demand)

- [root-cause-tracing](resources/root-cause-tracing.md) — trace a bad value backward to its origin; instrument when you can't trace by reading.
- [defense-in-depth](resources/defense-in-depth.md) — after the cause is found, validate at every layer the data passes through.
- [condition-based-waiting](resources/condition-based-waiting.md) — kill flaky async tests by waiting on the real condition, not an arbitrary sleep.
