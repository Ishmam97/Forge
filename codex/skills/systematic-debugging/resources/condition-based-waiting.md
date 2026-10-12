# Condition-Based Waiting

Flaky async tests usually come from one anti-pattern: waiting a fixed amount of time and hoping the work finished.

```
# flaky — guesses at timing
do_async_thing()
sleep(500ms)
assert result_is_ready()
```

The sleep is always wrong: too short and the test flakes on a slow machine; too long and the suite crawls. The number encodes a guess about timing, and timing varies with load, CI, and hardware.

**Principle:** wait for the actual condition, not for the clock.

## The fix

Poll the real condition up to a generous timeout, returning the instant it's true:

```
# pseudocode
wait_until(timeout=5s, interval=10ms):
  return result_is_ready()

assert result_is_ready()
```

`wait_until` returns as soon as the predicate holds (fast in the common case) and fails with a clear timeout only when the condition genuinely never becomes true (a real bug, not a flake). The timeout is an upper bound, not the expected wait.

Most ecosystems already ship this — `waitFor` / `eventually` / `Awaitility` / `poll` / framework-native async matchers. Prefer the built-in; only write your own `wait_until` helper if there isn't one.

## Better still — await the real signal

Polling is the fallback. If the system exposes a completion signal — a promise/future to await, an event to subscribe to, a callback, a queue-drained hook — await that directly. No polling, no timeout, deterministic.

## Rules

- A literal `sleep`/`setTimeout` in a test is a red flag. Justify it or replace it.
- The timeout is a safety ceiling, not the expected duration — set it well above the worst realistic case.
- If you can't express the thing you're waiting for as a checkable condition or an awaitable signal, you don't yet understand the async behavior — investigate before adding a sleep.
