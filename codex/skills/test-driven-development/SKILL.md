---
name: test-driven-development
description: Enforce RED → GREEN → REFACTOR — write a failing test, make it pass with minimal code, then clean up. Use when "write it test-first", "TDD this", or whenever /implement, implementer, or test-author start a change that introduces testable behavior. Do NOT use for throwaway prototypes, generated output files, or pure configuration with no callable behavior.
---

# Test-Driven Development

Operationalizes Rule 9 ("Tests verify intent, not just behavior"). A test written *after* the code answers "what does this do?" A test written *first* answers "what should this do?" Only the second is TDD.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Wrote the code before the test? Delete it and start over. No exceptions — don't keep it "as reference", don't "adapt" it while writing the test. Delete means delete.

## RED → GREEN → REFACTOR

### RED — write the failing test
One behavior, one test. The name describes the behavior, not the implementation.

```
# pseudocode
test "rejects transfer when balance insufficient":
  account = Account(balance=10)
  expect transfer(account, amount=50) raises InsufficientFunds
```

### Verify RED (never skip)
Run it. Confirm it **fails for the expected reason** — feature absent, not a typo or setup mistake. If it passes immediately, you're testing existing behavior; fix the test.

### GREEN — minimal code to pass
The least code that makes the test pass. No parameter, option, or abstraction the current test doesn't force. YAGNI is enforced by the suite, not by willpower.

### Verify GREEN (never skip)
Run the **full** suite. The new test passes, nothing previously green is now red, no unexpected warnings. Still failing? Fix the code, not the test.

### REFACTOR — clean up under green
Only once all tests pass: remove duplication, improve names, extract helpers. Add no behavior. Re-run after each change.

### Repeat
Next behavior, next failing test.

## What counts as a passing test — runnableCheck

A test is **not** passing if any of these hold. Treat them as failures and surface them (Rule 12):

| Condition | Why it doesn't count |
|---|---|
| Marked `skip` / `xit` / `todo` / `pending` | Not executing — zero signal |
| Assertion is always-true (`assert true`, `expect(true).toBe(true)`, `len >= 0`) | Passes regardless of behavior |
| 0 cases collected (parameterized over empty input) | Suite reports green on no work |
| Body is a placeholder / TODO / bare `pass` | No assertion — green by default |
| Runner reports 0 tests matched/run | Nothing was checked |

"Tests pass" is a lie if any shipped test is in this table.

## Common rationalizations

| Rationalization | Reality |
|---|---|
| "Too simple to test" | Simple code breaks too. The test costs 30 seconds. |
| "I'll add tests after" | After-tests pass on the first run — you never saw them catch anything. |
| "The test just mirrors the code" | Then the design is unclear. Hard to test = hard to use. Listen to the test. |
| "I already tested it by hand" | Ad-hoc isn't repeatable, recorded, or re-runnable under pressure. |
| "Deleting this code to start over is wasteful" | Sunk cost. Keeping code you can't trust is the real waste. |
| "I need to explore first" | Fine — throw the spike away, then start fresh with TDD. |
| "TDD is dogma, I'm being pragmatic" | TDD *is* pragmatic: bugs before commit, behavior documented, refactors made safe. |

## Scaffold integration

- **`test-author` owns the edge-case taxonomy** (null / empty / invalid / boundary / error / race / large-data / special-chars). Enumerate the failing tests from that taxonomy before writing any — don't duplicate it here.
- **`implementer` co-locates tests in the same task** (its rule 4). A plan that defers tests to a later story is a planning bug — flag it and write them anyway.
- **`/implement`** runs this cycle inside the editor step: each acceptance criterion gets a failing test before any implementation code for that AC.
- The **red-green regression check** is the TDD form of Rule 12: a regression test must fail on the old code and pass on the fix — verify both directions, don't assume.

## Anti-patterns

Full reference: [resources/testing-anti-patterns.md](resources/testing-anti-patterns.md) — load it when writing mocks, adding test utilities, or tempted to put test-only methods on a production class. Distilled:

- Test real behavior, not mock behavior.
- Production classes get no test-only methods — those live in test utilities.
- Mock at the right level; understand the dependency chain before mocking anything.
- Incomplete mocks fail silently — mirror the complete real data shape.

## Verification checklist

- [ ] Every new behavior had a test written **before** its implementation.
- [ ] Watched each test fail for the expected reason.
- [ ] Wrote minimal code to pass each.
- [ ] Full suite green, including pre-existing tests.
- [ ] No test is skipped, vacuous, or matches 0 cases (runnableCheck).
- [ ] Mocks, if any, pass the anti-patterns checklist.

Can't check every box? You skipped TDD. Start over.

## Exceptions (confirm with the user first)

Throwaway prototypes scoped as such; generated output files; pure config with no callable behavior. Thinking "skip it just this once"? That's the first rationalization in the table.
