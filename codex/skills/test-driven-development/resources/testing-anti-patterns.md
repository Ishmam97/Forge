# Testing Anti-Patterns

Load when writing or changing tests, adding mocks, or tempted to add test-only methods to production code.

**Core rule:** test what the code does, not what the mocks do.

## The three iron laws

```
1. NEVER test mock behavior
2. NEVER add test-only methods to production classes
3. NEVER mock without understanding the dependency chain
```

## Reference

| Anti-pattern | Symptom | Fix |
|---|---|---|
| **Testing mock existence** | Assertion checks that a mock was called or that a `*-mock` element rendered | Test real component behavior, or unmock and test the real thing |
| **Test-only methods in production** | `reset()` / `destroy()` on a production class, called only from tests | Move lifecycle/cleanup into a test utility; production owns only its real lifecycle |
| **Mocking without understanding** | The mock removes the side effect the test depends on; test passes for the wrong reason | Run against the real implementation first, see what the test needs, then mock minimally at the right level |
| **Incomplete mocks** | Test green, integration red — downstream code reads a field the mock omitted | Mirror the complete real data structure, including fields consumed downstream |
| **Over-complex mocks** | Mock setup is more than half the test; the mock breaks on an internal rename | Switch to an integration test with the real component — complex mocks signal a design problem |
| **Tests as an afterthought** | "Implementation complete — ready for testing" | TDD: tests first. A story with no tests isn't done. |

## Gate questions

- **Before asserting on any mock element:** "Am I testing real behavior or mock existence?" If mock existence — delete the assertion.
- **Before adding any method to a production class:** "Is this only called by tests?" If yes — it goes in a test utility.
- **Before mocking any method:** What side effects does the real method have? Does the test depend on any of them? Do I understand what the test actually needs? If unsure, run against the real implementation first, observe, then mock minimally.

## Red flags — stop

- Assertion checks for `*-mock` identifiers.
- A production class has a method only ever called from tests.
- Mock setup is more than half the test body.
- The test fails when you remove the mock (it was testing the mock).
- You can't explain in one sentence why the mock is needed.
- "I'll mock this to be safe."

## Why TDD prevents these

Writing the test first, against real code, forces you to observe what the code actually does and watch the failure for the right reason. Mocks added afterward get scoped to what the test truly needs, instead of guessed at in advance. Testing mock behavior is the tell-tale sign of mocks added before ever watching the test fail against reality.
