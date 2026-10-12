# Defense-in-Depth Validation

When a bug came from invalid data, fixing one spot feels enough. But a single check is bypassed by other code paths, by refactoring, or by mocks in tests.

**Principle:** validate at every layer the data passes through. Turn "we fixed the bug" into "the bug is structurally impossible."

## The four layers

1. **Entry / boundary.** Reject obviously-invalid input at the API or public-function edge — empty, wrong type, out-of-range, nonexistent path. Most bad data dies here.
2. **Business logic.** Re-assert the invariants this operation depends on, in its own terms ("a workspace needs a non-empty project dir"). Catches edge cases the boundary check didn't model.
3. **Environment guard.** Refuse dangerous operations in the wrong context — e.g. in a test run, refuse a destructive operation whose target isn't under a temp directory. Catches context-specific damage the other layers don't know about.
4. **Instrumentation.** Log the inputs + a stack/backtrace just before the risky operation. When the other three are somehow bypassed, this is how you find out why.

## Why all four

Each layer catches what the others miss: different code paths skip the boundary check; mocks skip the business-logic check; platform edge cases need the environment guard; and when something still slips through, the instrumentation tells you how. They're complementary, not redundant.

## Applying it

After tracing a bug to its source ([root-cause-tracing](root-cause-tracing.md)): map every checkpoint the bad value passed through, add the appropriate guard at each, then **test the guards** — deliberately bypass layer 1 and confirm layer 2 catches it. A guard you didn't watch fire is a guess.

## Caution

Don't over-apply. For a small, well-contained bug a single well-placed check at the source is right — adding four layers everywhere is its own complexity smell (and contradicts Rule 2, Simplicity First). Reach for full defense-in-depth when the bad value crosses module boundaries, when the blast radius is large (data loss, corruption, security), or when the same class of bug has recurred.
