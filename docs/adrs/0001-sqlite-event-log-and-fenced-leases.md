# ADR 0001: SQLite Event Log and Fenced Leases

**Status:** Proposed
**Date:** 2026-08-13
**Deciders:** AgentBus maintainers

## Context

AgentBus coordinates several independently running local processes. A claim must have one winner, accepted mutations must survive a daemon restart, and a late worker must not mutate a task after its lease was reassigned. The MVP is one repository on one machine; it needs no shared network database.

## Decision

Use one repository-scoped SQLite database in WAL mode. Each accepted command writes an immutable `events` row and its query projections in the same `BEGIN IMMEDIATE` transaction. Claims and lease-bound commands use a server-issued `lease_id` plus monotonically increasing `lease_epoch`; both are checked against the active, unexpired lease using the daemon clock before state changes. Every mutating command also carries a caller-generated `operation_id`, unique per repository, for idempotency.

## Alternatives considered

- **PostgreSQL plus a queue:** supports future remote coordination, but adds a service and account/operations burden that contradicts local-first MVP deployment.
- **JSON files with file locks:** easy to inspect, but crash recovery, idempotency, transactionality, and concurrent claims become application-specific and fragile.
- **SQLite without an event log:** simpler schema, but loses the auditable history and reliable UI replay required for handoffs and recovery.
- **SQLite event log with fenced leases (chosen):** embedded, durable, inspectable, and sufficient for one local daemon while preserving a clean future store boundary.

## Consequences

**Positive:**

- Atomic claims, transitions, event history, and idempotency are enforceable at one transaction boundary.
- Restart recovery can rebuild projections from durable events; WebSocket clients can resume from event sequence numbers.
- A stale worker is rejected even if it still knows a task ID.

**Negative / tradeoffs accepted:**

- SQLite has one writer, so Git subprocesses and held waits must remain outside write transactions.
- The daemon is the only supported writer; direct database editing is unsupported.
- Event and projection schema migrations require explicit versioning and backup discipline.

**Neutral / follow-ons required:**

- Benchmark four sessions against the p95 targets and add crash/restart tests.
- If cross-machine coordination becomes in scope, retain the command/event boundary and replace only the store/transport implementation.

## References

- [PRD: Cross-Agent Collaboration MCP](../prd/cross-agent-collaboration-mcp.md)
- [Architecture: Cross-Agent Collaboration MCP](../architecture/cross-agent-collaboration-mcp.md)
