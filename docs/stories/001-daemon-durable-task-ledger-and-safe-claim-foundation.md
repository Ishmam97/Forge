# Story 001: Daemon, Durable Task Ledger, and Safe Claim Foundation

**Status:** In progress
**PRD:** [Cross-Agent Collaboration MCP](../prd/cross-agent-collaboration-mcp.md)
**Architecture:** [Cross-Agent Collaboration MCP — First implementation story](../architecture/cross-agent-collaboration-mcp.md#first-implementation-story)
**Estimate:** 3–5 days
**Depends on:** none

## Goal

Ship the repository-local coordination kernel: explicit daemon startup, durable session/task/event state, atomic two-phase Worker claims with core-created Git worktrees, and fenced lease recovery.

## Architectural context

AgentBus uses one repository-scoped SQLite database in WAL mode. Accepted commands append an immutable event and update query projections inside one short `BEGIN IMMEDIATE` transaction; mutating commands carry an idempotent `operation_id`. A claim is deliberately two-phase: reserve a task and pending lease transactionally, create its derived Git branch/worktree outside the SQLite lock, then activate the lease and transition to `in_progress` in a second transaction. A failed provision compensates to the prior claimable state and returns no authority. Lease-bound mutations must present the matching active, unexpired `{lease_id, lease_epoch}` fence.

This story implements the core’s local HTTP command boundary rather than the MCP adapter. It establishes the commands that later MCP and UI clients will call. It does not implement long-poll, WebSockets, role overrides, review, merge, messages, usage completion, or cleanup.

## Implementation status — 2026-08-19

### Completed

- Repository-local SQLite/WAL state, durable sessions and tasks, idempotent operations, append-only events, and `BEGIN IMMEDIATE` command transactions.
- Loopback daemon startup with canonical Git-root validation and actionable Windows refusal.
- Core-generated, generation-safe Git worktrees; atomic two-phase claims; dependency rejection; and real-Git compensation after provisioning failure.
- Fenced lease activation, heartbeat replay, expiry reconciliation (clean requeues; dirty blocks), and active-lease persistence across a restart.
- Local JSON commands for session registration, task creation/detail, claim, heartbeat, and expiry reconciliation. Task detail returns only the requested task and its event history.
- Typed operation-scoped HTTP errors, including stale-lease `409` responses, without returning task context in error payloads.
- 25 passing Vitest tests, successful TypeScript check, and production build at the latest checkpoint.

### Remaining

- Add the validated project configuration loader and wire CLI `--config` values for integration branch, lease duration, and worktree-root derivation.
- Split/strengthen the database schema/migration surface with explicit indexes and add direct database durability/event-count coverage, including an acknowledged-mutation abrupt-close equivalent.
- Complete safety coverage for repository/task values containing spaces or shell metacharacters, and broaden typed error coverage beyond task creation and lease fences.
- Review the completed foundation against the full Story 001 acceptance criteria, then update this story to **Done** only when those final checks pass.

## Affected files

- `package.json` — add the Node/TypeScript workspace scripts and runtime/test dependencies.
- `tsconfig.json` — strict TypeScript compiler configuration for source and tests.
- `src/cli.ts` — `agentbus serve --repo <path>` entry point and Linux/macOS startup checks.
- `src/config.ts` — validated minimal daemon configuration: integration branch, lease duration, and worktree root derivation.
- `src/domain/types.ts` — vendor-neutral task, session, lease, event, request, and response types used by the foundation.
- `src/domain/errors.ts` — typed safe command errors and HTTP mapping.
- `src/db/database.ts` — repository-scoped SQLite WAL connection, migrations, transaction wrapper, and restart reopening.
- `src/db/schema.ts` — event, operation/idempotency, session, task, lease, and worktree projections with required constraints and indexes.
- `src/core/agentbus-service.ts` — registration, task creation/context, two-phase claim, heartbeat, lease expiry reconciliation, and operation-id replay.
- `src/git/git-worktree-service.ts` — canonical repository checks and argument-array Git calls to create/status task worktrees.
- `src/http/server.ts` — loopback-only health and foundation JSON endpoints that delegate to `AgentBusService`.
- `src/index.ts` — public daemon factory exports for CLI and integration tests.
- `tests/support/git-repository.ts` — deterministic temporary Git-repository fixture and command helpers.
- `tests/database.test.ts` — WAL/migration/reopen and event/idempotency durability coverage.
- `tests/agentbus-service.test.ts` — registration/task/claim/heartbeat/expiry/fencing behavior tests.
- `tests/git-worktree-service.test.ts` — core-derived worktree provisioning and failure behavior with temporary repositories.
- `tests/http-server.test.ts` — loopback startup, invalid-repository rejection, and foundation command contract tests.

## Acceptance criteria

- [ ] `[SESSION-01]` WHEN `agentbus serve --repo <path>` receives a canonical Git repository on Linux or macOS THEN it SHALL start one local daemon; WHEN `<path>` is not a repository or the platform is Windows THEN it SHALL fail with an actionable error.
- [ ] `[SESSION-02, NFR-SEC-01, NFR-SEC-03]` WHEN the daemon starts THEN it SHALL create/open only repository-local state, enable SQLite WAL, bind its HTTP listener to loopback, and make no outbound connection.
- [ ] `[SESSION-03, SESSION-04, NFR-COMPAT-01]` WHEN a caller registers two sessions using one Worker profile and one session using a Lead profile THEN it SHALL persist three distinct sessions with vendor-neutral role/profile data.
- [ ] `[TASK-01, TASK-02, TASK-03, TASK-05]` WHEN the Lead creates a complete independent Worker task THEN it SHALL persist it as `unclaimed` with an append-only event; WHEN task creation is missing required handoff data or a claim targets an unsatisfied dependency THEN the service SHALL reject without state change.
- [ ] `[TASK-04]` WHEN a caller requests a task context THEN it SHALL receive that one task and its own event history, and no foundation endpoint SHALL return a full-board dump.
- [ ] `[CLAIM-03, CLAIM-04, WORKTREE-01, WORKTREE-02, WORKTREE-03, WORKTREE-04]` WHEN two Worker sessions concurrently claim one eligible task THEN exactly one SHALL receive a valid fenced lease and a distinct absolute core-created worktree path; WHEN provisioning fails THEN the task SHALL return to its prior claimable state and neither claimant SHALL receive authority.
- [ ] `[CLAIM-05, CLAIM-06, NFR-REL-01]` WHEN a Worker heartbeats with its current active fence THEN the lease SHALL extend; WHEN it uses a stale, superseded, or expired fence THEN the command SHALL reject without changing task state.
- [ ] `[CLAIM-07]` WHEN an active lease expires and its worktree is clean THEN the task SHALL become `unclaimed`; WHEN the worktree is dirty THEN the task SHALL become `blocked`; both paths SHALL retain history and worktree metadata.
- [ ] `[EVENT-01, EVENT-02, EVENT-03, NFR-REL-02]` WHEN a mutation is accepted THEN it SHALL append a durable event and projection update atomically; WHEN its `operation_id` is retried THEN it SHALL replay the original result without a second event; WHEN the daemon restarts THEN it SHALL recover sessions, tasks, events, active leases, and worktree metadata.
- [ ] `[NFR-SEC-02]` WHEN repository names or task metadata contain spaces or shell metacharacters THEN Git worktree provisioning SHALL pass values as argument data and SHALL not execute shell interpolation.
- [ ] `[NFR-OBS-01]` WHEN a foundation command fails THEN the returned error and log record SHALL include an operation identifier and actionable typed reason without emitting task context or capability data.

## Test plan

Apply RED → GREEN → REFACTOR for each behavior below. Do not add production implementation for a behavior until its focused test has failed for the expected missing-behavior reason.

- **Startup and storage:** write failing tests for non-repository and Windows rejection; valid repository startup creates `.agentbus/state.sqlite`, enables WAL, and binds a loopback listener; reopen the same database and observe persisted data.
- **Registration and task creation:** write failing tests for multiple sessions sharing one profile, vendor-neutral persisted roles, complete task creation event, missing mandatory handoff fields, and dependency-blocked claim eligibility.
- **Idempotency:** write a failing test that submits the same `operation_id` twice and proves one event/projection mutation with the original result returned on retry.
- **Claim collision:** write a deterministic `Promise.all` test using two registered Workers and one task; prove one reservation/provision/activation winner, one non-authoritative loser, one active lease, and one worktree.
- **Git provisioning:** write failing temporary-repository integration tests proving an internally derived branch and absolute worktree are created; force Git provisioning failure and prove compensation restores claimability with no active lease or path.
- **Lease fencing and expiry:** write failing tests for successful heartbeat, stale epoch rejection after reassignment/expiry, expiration of a clean worktree to `unclaimed`, and expiration of a dirty worktree to `blocked`. Inject the clock and Git-status seam so tests do not sleep.
- **Durability:** write a failing test that creates and claims work, closes/reopens the daemon database, and verifies projections and active lease metadata persist. Add an abrupt-close equivalent at the database boundary after an acknowledged mutation.
- **Safety and errors:** write failing tests using paths/labels with spaces and shell metacharacters, confirming only expected Git worktree output occurs; assert error responses include operation IDs and omit full task context.

## Out of scope

- MCP server/adapter and agent activation loops, including bounded long-poll.
- Browser UI, WebSocket events, role overrides, and human commands.
- Messages, completion evidence, usage checkpoints beyond the claim-time storage needed by the schema.
- Review, requested changes, merge approval, merge attempts, conflict retries, and cleanup UI.
- File-scope overlap warnings, task cancellation, and multi-task dependency scheduling beyond rejecting a known unmet dependency.
- macOS end-to-end CI coverage; code must remain portable to macOS, but local Linux test coverage is the first implementation gate.

## Notes for implementer

- Use Node.js LTS, strict TypeScript, Fastify, a maintained synchronous SQLite driver, and Vitest as selected in the architecture. Pin exact versions in the new root manifest and lockfile.
- Keep Git subprocesses outside SQLite write transactions. Use `execFile`/`spawn` with argument arrays and a controlled working directory only.
- The primary worktree must never be used to create a task worktree or to integrate code. Derive branch/worktree identifiers from internal UUIDs rather than agent-provided text.
- `claimed` is a provisioning reservation, never a state that grants Worker authority. Return a lease and path only after the activation transaction succeeds.
- Treat `lease_id` plus monotonically increasing `lease_epoch` as a single fence. Do not accept a task ID alone as authority.
- Preserve failed/dirty worktrees. Do not add automatic cleanup here.
- If a dependency cannot be modeled without the later scheduler, persist dependency IDs and reject explicit claims with unfinished dependencies; do not add long-poll as a shortcut.
