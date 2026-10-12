# Root-Cause Tracing

Bugs surface deep in the call stack — a file written to the wrong path, a DB opened with the wrong name, a null three frames down. The instinct is to fix where the error appears. That's a symptom patch.

**Principle:** trace backward through the call chain to the original trigger, then fix at the source.

## The trace

1. **Observe the symptom.** The exact failure, with its values: `init failed in /repo/packages/core`.
2. **Find the immediate cause.** What line directly produces it? (e.g. a subprocess run with `cwd = projectDir`.)
3. **Ask what called it — with what value.** Walk up the chain: who passed `projectDir`? What was its value there?
4. **Keep going up** until the value stops being wrong, i.e. you find where the bad value was *born* (an empty string defaulted to the current directory; a config key read before it was set).
5. **Fix at the source.** Repair where the bad value originates, not where it detonates.

## When you can't trace by reading — instrument

Add a log *before* the dangerous operation that prints the suspect inputs and a captured stack/backtrace:

```
# pseudocode, before the operation that fails
log.error("TRACE before <op>", { arg, working_dir, env_relevant, stacktrace=capture_stack() })
run(<op>)
```

Then reproduce and filter to that marker. Read the stack to see which caller and which input triggered it. Log *before* the failure, not after — once it throws, the context is gone. In tests, write to a stream that isn't suppressed (stderr, not a possibly-silenced logger). Include enough context to disambiguate: inputs, working directory, relevant env vars.

## Isolating which test pollutes shared state

If something bad appears during a test run but you don't know which test causes it, bisect: run tests in halves, narrow to the half that reproduces it, repeat until one test remains. Don't eyeball a thousand tests — bisection finds the polluter in log₂(n) runs.

## The rule

Never fix only where the error appears. Trace to the origin. Then — see [defense-in-depth](defense-in-depth.md) — add a guard at each layer so the same bad value can't travel that far again.
