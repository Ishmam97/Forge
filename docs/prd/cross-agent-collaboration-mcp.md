# PRD: Cross-Agent Collaboration MCP

**Status:** Draft
**Owner:** Ishmam
**Date:** 2026-08-13
**Brief:** [Cross-Agent Collaboration MCP](../briefs/cross-agent-collaboration-mcp.md)
**Working name:** AgentBus (codename; final naming is not an MVP gate)

## Problem and context

A developer running multiple coding-agent CLIs has no shared, authoritative place for those agents to coordinate. Each agent has its own context and process, so the developer must relay task state between terminals, manually sequence dependent work, create and track worktrees, and repeatedly poll agents for status. Running agents concurrently in one working tree risks destructive interference; running them sequentially gives up the wall-clock benefit of multiple agents.

The MVP is a local-first, vendor-neutral coordination substrate for a single developer supervising independently launched agent CLIs on one machine. A local core owns task state, agent identity, messages, usage checkpoints, and git worktrees. Agents interact through an MCP adapter; the developer supervises and overrides through a thin live UI. The initial proving configuration is one Claude Code session acting as Lead/Reviewer and two Codex sessions acting as Workers. This bounds the compatibility matrix without encoding either vendor into the role model.

The product is differentiated from cloud boards by keeping coordination state local, and from worktree launchers or SCM observers by giving agents an authoritative board they can read and mutate themselves. The substrate itself makes no outbound network calls. Agent CLIs may separately communicate with their model providers; those vendor connections are outside the product's local-only boundary.

The activation feasibility risk recorded in the brief is resolved for the initial proving clients. A spike showed that held-open MCP tool calls complete cleanly after at least 130 seconds on Claude Code 2.1.193 and Codex 0.142.0. The MVP therefore uses configurable bounded long-polling, with timeout, cancellation, and retry behavior specified by architecture and verified through a repeated-handoff test.

## Goals and success measures

The MVP succeeds when the canonical vertical slice demonstrates all of the following:

1. **No human relay during execution.** From the moment all three agent sessions are registered until both tasks await human merge approval, the developer performs zero copy-paste handoffs, status-poll commands, agent wake-up commands, or manual worktree setup. Starting the daemon and three client sessions is setup and is excluded from this interval. The one final human merge decision per task is also excluded.
2. **Real parallelism.** Two disjoint tasks executed by two Worker sessions reach `merge_ready` within 1.2 times the duration of the slower task, excluding Lead decomposition and human review time, and faster than the measured sequential baseline for the same tasks.
3. **Reliable coordination.** The canonical slice has no unrecovered coordination failures; exactly one session wins each contested claim; bounded waits resume without human prompting; leases renew and expire according to policy; and every visible state transition reaches the UI.
4. **Safe merge gating.** A Lead review is necessary but insufficient to merge. Each merge requires an explicit human approval. A deliberately conflicting merge is blocked, surfaced to the human, and never resolved autonomously.
5. **Complete MVP telemetry.** Both tasks record claim-time and completion-time self-reported usage checkpoints. Accuracy and cross-vendor normalization are not MVP success measures.

## Users and use cases

The primary user is one developer on one machine who is comfortable running multiple coding-agent CLIs, using Git, and supervising agent output.

Top use cases:

- Split one goal into disjoint implementation tasks and execute them concurrently in isolated worktrees.
- Hand work from a Lead to idle Workers without copying prompts or waking the Workers manually.
- See task ownership, progress, blockers, messages, review state, worktree location, and rough usage in one live view.
- Review completed work through a Lead while reserving merge authority for the human.
- Replace or reassign an unavailable agent session without changing the core's vendor-neutral task model.

### Personas

- **Solo agent orchestrator — developer supervising the session**
  - Goals: reduce coordination overhead, preserve control over merges, and use the best available CLI for each role.
  - Pain points: manual context relay, terminal polling, worktree bookkeeping, hidden agent failure, and accidental concurrent edits.
- **Lead/Reviewer — an agent session bound to coordination roles**
  - Goals: decompose goals, publish self-contained tasks, track dependencies, review results, and recommend work for merge.
  - Pain points: no authoritative cross-client state, no reliable worker wake-up mechanism, and incomplete handoff context.
- **Worker — an agent session bound to implementation work**
  - Goals: receive eligible work, claim it once, work in the correct isolated directory, report progress, and hand off tested results.
  - Pain points: stale assignments, conflicting claims, ambiguous paths, missing task context, and no durable completion channel.

## User stories

- **US1 — Configure a local team.** As a developer, I want to bind agent profiles to abstract roles in project configuration and override those bindings in the UI, so I can change vendors or session assignments without changing the core.
- **US2 — Delegate a goal.** As a Lead, I want to create self-contained tasks with dependencies and disjoint file scopes, so Workers can act without receiving copied context from the human.
- **US3 — Receive and claim work.** As a Worker, I want to wait for eligible work and claim it atomically, so I can begin promptly without racing another Worker.
- **US4 — Work in isolation.** As a Worker, I want the core to give me a task-specific worktree and preserve task context there, so concurrent Workers do not edit one working tree.
- **US5 — Coordinate through shared state.** As an agent, I want to post progress, messages, test evidence, blockers, and usage checkpoints, so other agents and the human can act without terminal-to-terminal relay.
- **US6 — Review and merge safely.** As a developer, I want Lead review followed by explicit human merge approval, so agents can automate handoffs without taking final integration authority.
- **US7 — Supervise and intervene.** As a developer, I want a live local view with reassignment and blocking alerts, so I can understand and correct a session without polling each terminal.
- **US8 — Recover from interruption.** As a developer, I want board state and active work to survive daemon or agent interruption, so a failed process does not silently lose coordination state.

## Functional requirements

### Session and identity

- **[SESSION-01] [MUST]** The product SHALL provide an explicit command that starts one core service for a selected local Git repository and rejects paths that are not valid repositories.
- **[SESSION-02] [MUST]** The core SHALL persist coordination state in a repository-scoped local database and expose agent and UI interfaces only on the local machine by default.
- **[SESSION-03] [MUST]** Every agent process SHALL establish a session through a registration handshake that records a durable logical agent identity, a unique session identity, capabilities, and declared profile without encoding a vendor into the role schema.
- **[SESSION-04] [MUST]** Multiple concurrent sessions of one agent profile SHALL be supported, including two Codex Worker sessions in the canonical slice.
- **[SESSION-05] [SHOULD]** The UI SHALL show whether each registered session is waiting, working, unavailable, or disconnected, based only on core-observed state.

### Roles and configuration

- **[ROLE-01] [MUST]** Project configuration SHALL bind agent profiles or sessions to abstract roles, initially including Lead, Worker, and Reviewer.
- **[ROLE-02] [MUST]** The developer SHALL be able to override a role or task assignment through the UI while the session is running.
- **[ROLE-03] [MUST]** A reassignment SHALL be recorded as an event and SHALL not allow two valid leases to control one task.
- **[ROLE-04] [WONT]** The Lead SHALL NOT autonomously finalize a proposed role-binding change in the MVP; human configuration or UI action remains authoritative.

### Tasks and context

- **[TASK-01] [MUST]** The Lead SHALL be able to create a task containing a title, objective, self-contained context, testable acceptance criteria, expected file scope, dependencies, and eligible role.
- **[TASK-02] [MUST]** A task SHALL expose a lifecycle covering at least `unclaimed`, `claimed`, `in_progress`, `merge_ready`, `in_review`, `changes_requested`, `awaiting_human_approval`, `blocked`, `merged`, and `cancelled`.
- **[TASK-03] [MUST]** A task with unmet dependencies SHALL NOT be eligible for a Worker claim.
- **[TASK-04] [MUST]** Agents SHALL retrieve only assigned-task summaries and one task's context at a time; the MCP surface SHALL NOT provide a full-board context dump.
- **[TASK-05] [MUST]** Every state change SHALL validate the current state and actor authority, reject invalid transitions, and append an immutable event.
- **[TASK-06] [SHOULD]** The core SHALL detect declared file-scope overlap between concurrently eligible tasks and warn the Lead and developer before both are claimed.
- **[TASK-07] [MUST]** The developer SHALL be able to cancel any task that has not reached `merged`; cancellation SHALL release an active lease, record the event, and preserve the task's worktree and history for later cleanup under [WORKTREE-05].

### Activation, claims, and leases

- **[CLAIM-01] [MUST]** An idle registered agent SHALL be able to make a bounded wait request for its next eligible work item — a claimable task for a Worker, a review-needed task for a Lead/Reviewer — and the request SHALL return either work metadata or an explicit empty timeout result.
- **[CLAIM-02] [MUST]** After an empty timeout result or an unsuccessful claim, the supported activation contract SHALL cause the agent to wait again without a human message or command.
- **[CLAIM-03] [MUST]** Claiming SHALL be atomic: if multiple eligible sessions contend for one task, exactly one SHALL receive a successful claim and valid lease.
- **[CLAIM-04] [MUST]** A successful claim SHALL return a lease identifier and the absolute core-created worktree path. A losing or invalid claim SHALL return no working authority.
- **[CLAIM-05] [MUST]** A lease SHALL begin only after a claim succeeds; an idle bounded wait SHALL NOT require or renew a task lease.
- **[CLAIM-06] [MUST]** An active Worker SHALL renew its lease through explicit heartbeat operations, and the core SHALL reject task mutations made with an expired or superseded lease.
- **[CLAIM-07] [MUST]** When a lease expires, the core SHALL release the claim, preserve the task worktree and event history, and reject subsequent task mutations under the expired lease. A clean worktree SHALL make the task automatically claimable again; a worktree containing changes SHALL move the task to `blocked` until the human explicitly reassigns it.
- **[CLAIM-08] [MUST]** Cancellation of a bounded wait caused by client disconnect or daemon shutdown SHALL release all waiter resources without mutating task state.

### Worktree isolation

- **[WORKTREE-01] [MUST]** Only the core SHALL create and register task worktrees; agent tools SHALL NOT accept an agent-selected worktree path.
- **[WORKTREE-02] [MUST]** Concurrent tasks SHALL use distinct worktree directories and branches derived from validated repository and task identities.
- **[WORKTREE-03] [MUST]** If worktree creation fails, the task SHALL NOT enter `in_progress`; the failure SHALL be recorded and surfaced without returning a usable lease/path pair.
- **[WORKTREE-04] [MUST]** The core SHALL report worktree and branch identity in task context and UI state.
- **[WORKTREE-05] [SHOULD]** After a task is merged or cancelled, the developer SHALL be able to request safe cleanup; the product SHALL refuse cleanup when uncommitted work would be destroyed.

### Messages, evidence, and usage

- **[COLLAB-01] [MUST]** An agent holding a valid task lease SHALL be able to post progress and blocker messages linked to that task.
- **[COLLAB-02] [MUST]** The Lead, assigned Worker, and developer SHALL be able to read a task's ordered message and event history without reading unrelated task histories.
- **[COLLAB-03] [MUST]** Moving a task to `merge_ready` SHALL require a result summary, changed-branch reference, and structured test evidence including command, outcome, and timestamp.
- **[USAGE-01] [MUST]** Workers SHALL record self-reported usage checkpoints at successful claim and completion; the core SHALL store their delta when both exist.
- **[USAGE-02] [MUST]** The UI SHALL distinguish missing, partial, and complete usage checkpoint pairs and SHALL label self-reported values as estimates.
- **[USAGE-03] [WONT]** The MVP SHALL NOT make assignment, rejection, or budget-enforcement decisions from self-reported usage.

### Review and merge

- **[REVIEW-01] [MUST]** A Lead/Reviewer SHALL be able to receive a `merge_ready` task through the bounded wait of [CLAIM-01], accept it for review, inspect its task context and evidence, and record approval or requested changes.
- **[REVIEW-02] [MUST]** Lead approval SHALL transition a task to `awaiting_human_approval`; it SHALL NOT merge code.
- **[REVIEW-03] [MUST]** Recorded requested changes SHALL transition the task to `changes_requested`, retain its existing task worktree, carry the review feedback in the task's context and history, and make the task eligible again through [CLAIM-01] for a session in its eligible role.
- **[MERGE-01] [MUST]** Only an explicit human action in the UI SHALL authorize the core to attempt a task merge.
- **[MERGE-02] [MUST]** A merge attempt SHALL target the configured integration branch and record the initiating human action, source branch, target revision, outcome, and resulting revision when successful.
- **[MERGE-03] [MUST]** A merge conflict SHALL stop the merge, transition the task to `blocked`, preserve the worktree and conflict evidence, and alert the developer. The product SHALL NOT invoke autonomous conflict resolution.
- **[MERGE-04] [MUST]** A task SHALL reach `merged` only after a successful core-observed merge following Lead approval and human authorization.
- **[MERGE-05] [MUST]** After the developer resolves a blocked merge conflict outside the product, the UI SHALL provide a retry action; the core SHALL verify that no unresolved conflict remains before retrying and SHALL retain both attempt records.

### Supervisor UI and event history

- **[UI-01] [MUST]** The local UI SHALL show tasks grouped by lifecycle state with assignee/session, dependencies, worktree, latest progress, lease health, review state, merge gate, and usage-checkpoint status.
- **[UI-02] [MUST]** Task, message, session, lease, review, and merge events SHALL appear in the UI without manual refresh.
- **[UI-03] [MUST]** The UI SHALL provide the human actions required for task reassignment, task cancellation, Lead-review inspection, merge approval/rejection, and safe worktree cleanup.
- **[EVENT-01] [MUST]** The core SHALL store an append-only event record for every accepted state-changing operation, including actor, session, task when applicable, timestamp, event type, and operation identifier.
- **[EVENT-02] [MUST]** Repeating a state-changing request with the same operation identifier SHALL not apply the mutation twice.
- **[EVENT-03] [MUST]** On restart, the core SHALL reconstruct the same visible board, identities, messages, reviews, usage status, and non-expired leases from persisted state and events.

## Non-functional requirements

- **[NFR-PERF-01] (Responsiveness):** Excluding bounded waits and Git subprocess duration, local API operations SHALL complete in under 200 ms at p95 during a four-session workload on the reference machine — at minimum a 4-core CPU, 16 GB RAM, and SSD storage, with the exact tested specification recorded in the release notes.
- **[NFR-PERF-02] (Live updates):** Accepted events SHALL become visible in the local UI within one second at p95.
- **[NFR-REL-01] (Consistency):** Claim, lease, transition, and idempotency rules SHALL remain correct under concurrent requests and daemon restart.
- **[NFR-REL-02] (Durability):** Once a state-changing operation is acknowledged, abrupt daemon termination SHALL NOT erase the accepted event from the local store.
- **[NFR-SEC-01] (Local boundary):** The substrate SHALL make no outbound network connections during normal operation and SHALL bind network listeners to loopback by default.
- **[NFR-SEC-02] (Repository safety):** All repository, branch, revision, and worktree inputs SHALL be validated before invoking Git; subprocess arguments SHALL not be constructed through shell interpolation of untrusted values.
- **[NFR-SEC-03] (Data handling):** Coordination state, messages, usage estimates, and event history SHALL remain in local repository-scoped storage unless the developer explicitly exports them.
- **[NFR-OBS-01] (Observability):** Daemon logs SHALL include operation identifiers and actionable errors without storing secrets or duplicating full task context by default.
- **[NFR-COMPAT-01] (Agent neutrality):** Core task, role, event, and message schemas SHALL contain no Claude- or Codex-specific required fields.
- **[NFR-COMPAT-02] (Proving clients):** The release SHALL document and pass the canonical slice with supported Claude Code and Codex versions; adding another MCP-capable agent SHALL require a profile/configuration addition rather than a core schema change.
- **[NFR-PLATFORM-01] (Platforms):** The MVP SHALL support Linux and macOS. Windows SHALL be explicitly unsupported for the MVP.
- **[NFR-COST-01] (Local operation):** The substrate SHALL require no hosted account, subscription, or paid coordination service.

## Acceptance criteria

### US1 — Configure a local team

- [ ] **[SESSION-01, SESSION-02]** WHEN the developer starts the service in a valid repository THEN the system SHALL create or open repository-scoped local state and expose only local interfaces; WHEN the path is not a Git repository THEN startup SHALL fail with an actionable error.
- [ ] **[SESSION-03, SESSION-04]** WHEN one Claude session and two Codex sessions register THEN the system SHALL create three distinct session records attached to vendor-neutral logical profiles and roles.
- [ ] **[ROLE-01, ROLE-02, ROLE-03]** WHEN project configuration binds Claude to Lead/Reviewer and Codex to Worker and the developer overrides an assignment in the UI THEN the system SHALL apply the override, record it, and preserve single-lease ownership.
- [ ] **[ROLE-04, NFR-COMPAT-01]** WHEN an agent proposes or requests a role change THEN the system SHALL require human confirmation and SHALL represent the role without vendor-specific schema fields.

### US2 — Delegate a goal

- [ ] **[TASK-01]** WHEN the Lead creates two tasks THEN each stored task SHALL contain objective, context, acceptance criteria, expected file scope, dependencies, and eligible role sufficient for a Worker to proceed without human-relayed context.
- [ ] **[TASK-02, TASK-05]** WHEN an actor requests an invalid lifecycle transition THEN the system SHALL reject it without changing the task and SHALL retain an auditable rejection or error record according to the architecture's event policy.
- [ ] **[TASK-03]** WHEN a task's dependency is incomplete THEN bounded waits and claim attempts SHALL not offer that task; WHEN the dependency becomes eligible THEN waiting Workers SHALL be able to receive it.
- [ ] **[TASK-04]** WHEN an agent requests its work list or one task's context THEN the system SHALL return only the relevant summaries/context and SHALL expose no MCP operation that dumps the full board.
- [ ] **[TASK-06]** WHEN the Lead makes two file-overlapping tasks concurrently eligible THEN the system SHALL surface a warning before both tasks are claimed.
- [ ] **[TASK-07]** WHEN the developer cancels an unmerged task THEN the system SHALL release any active lease, record the cancellation, reject later mutations under that lease, and preserve the task's worktree and history.

### US3 — Receive and claim work

- [ ] **[CLAIM-01, CLAIM-02]** WHEN an eligible task appears during a Worker's bounded wait THEN the wait SHALL return that task without a human prompt; WHEN the bound elapses empty OR the Worker loses a contested claim THEN the supported activation loop SHALL wait again without human intervention.
- [ ] **[CLAIM-03, CLAIM-04]** WHEN two Worker sessions concurrently claim one task THEN exactly one SHALL receive the task's valid lease and worktree path and the other SHALL receive a non-authoritative result.
- [ ] **[CLAIM-05, CLAIM-06]** WHEN a Worker is idle THEN it SHALL hold no task lease; WHEN it owns a task and sends valid heartbeats THEN its lease SHALL remain active and permit authorized task mutations.
- [ ] **[CLAIM-07]** WHEN a Worker stops heartbeating until lease expiry THEN the system SHALL release its claim, preserve its worktree/history, and reject later mutations under the expired lease; WHEN the worktree is clean THEN the task SHALL become claimable automatically; WHEN it contains changes THEN the task SHALL become `blocked` until the human explicitly reassigns it.
- [ ] **[CLAIM-08]** WHEN a client disconnects during a bounded wait THEN the system SHALL release the waiter without claiming or changing a task.

### US4 — Work in isolation

- [ ] **[WORKTREE-01, WORKTREE-02, WORKTREE-04]** WHEN two Workers claim two disjoint tasks THEN the core SHALL create and return distinct absolute worktree paths and branch identities and show both in task context and the UI.
- [ ] **[WORKTREE-03]** WHEN Git cannot create a requested worktree THEN the Worker SHALL receive no usable lease/path pair, the task SHALL not enter `in_progress`, and the failure SHALL be visible.
- [ ] **[WORKTREE-05]** WHEN cleanup is requested for a completed worktree with uncommitted changes THEN the system SHALL refuse destructive cleanup and explain why.
- [ ] **[NFR-SEC-02]** WHEN repository-derived values contain spaces or shell metacharacters THEN worktree operations SHALL treat them as data and SHALL not execute unintended shell input.

### US5 — Coordinate through shared state

- [ ] **[COLLAB-01, COLLAB-02]** WHEN a valid Worker posts progress or a blocker THEN the task's Lead and developer SHALL see the ordered message in that task's history without receiving unrelated task history.
- [ ] **[COLLAB-03]** WHEN a Worker requests `merge_ready` without a result summary, branch reference, or structured test evidence THEN the system SHALL reject the transition and identify the missing evidence.
- [ ] **[USAGE-01, USAGE-02]** WHEN both checkpoints exist THEN the UI SHALL display a labeled estimate and delta; WHEN either is absent THEN it SHALL display partial or missing status rather than a fabricated value.
- [ ] **[USAGE-03]** WHEN usage is missing or high THEN the system SHALL NOT automatically reject, reroute, or stop a task in the MVP.

### US6 — Review and merge safely

- [ ] **[CLAIM-01, REVIEW-01]** WHEN a task reaches `merge_ready` while the Lead is in a bounded wait THEN the wait SHALL return that task for review without a human prompt or wake-up command.
- [ ] **[REVIEW-01, REVIEW-02]** WHEN the Lead approves a `merge_ready` task THEN the system SHALL store the review and move the task to `awaiting_human_approval` without merging code.
- [ ] **[REVIEW-03]** WHEN the Lead records requested changes THEN the task SHALL move to `changes_requested`, retain its worktree, expose the feedback in task context, and become claimable again without human relay.
- [ ] **[MERGE-01, MERGE-02]** WHEN no human approval exists THEN the core SHALL refuse to merge; WHEN the developer approves in the UI THEN the core SHALL attempt the configured merge and record its inputs and outcome.
- [ ] **[MERGE-03]** WHEN a deliberate merge conflict occurs THEN the core SHALL stop, mark the task `blocked`, preserve evidence, and alert the developer without invoking an agent to resolve it autonomously.
- [ ] **[MERGE-04]** WHEN the authorized merge completes successfully THEN and only then SHALL the task become `merged` and record the resulting revision.
- [ ] **[MERGE-05]** WHEN the developer resolves the conflict outside the product and requests retry in the UI THEN the core SHALL verify that no unresolved conflict remains, attempt the merge again, and preserve the original and retry outcomes.

### US7 — Supervise and intervene

- [ ] **[SESSION-05, UI-01]** WHEN the canonical three sessions are active THEN the UI SHALL show whether each session is waiting, working, unavailable, or disconnected and SHALL show each task's state, assignee, dependencies, worktree, progress, lease, review, merge gate, and usage status in one view.
- [ ] **[UI-02, NFR-PERF-02]** WHEN the core accepts a state-changing event THEN it SHALL appear in an already-open UI within one second at p95 without manual refresh.
- [ ] **[UI-03]** WHEN a task needs reassignment, cancellation, review inspection, merge approval/rejection, or cleanup THEN the UI SHALL expose the corresponding human action and its outcome.
- [ ] **[NFR-PERF-01]** WHEN four local sessions generate ordinary board operations THEN non-Git, non-wait API latency SHALL remain below 200 ms at p95 on the documented reference machine.

### US8 — Recover from interruption

- [ ] **[EVENT-01, EVENT-02]** WHEN the same state-changing operation identifier is submitted twice THEN the system SHALL apply it once and retain actor, session, timestamp, type, and task linkage in the event record.
- [ ] **[EVENT-03, NFR-REL-01, NFR-REL-02]** WHEN the daemon terminates after acknowledging operations and restarts THEN it SHALL reconstruct the same visible state and preserve valid lease semantics without duplicating acknowledged mutations.
- [ ] **[NFR-SEC-01, NFR-SEC-03]** WHEN the canonical slice runs with outbound access denied to the substrate THEN coordination SHALL still work and no coordination state SHALL leave local storage.
- [ ] **[NFR-OBS-01]** WHEN an operation fails THEN logs SHALL identify the operation and actionable cause without logging secrets or full task context by default.
- [ ] **[NFR-COMPAT-02, NFR-PLATFORM-01, NFR-COST-01]** WHEN the release is verified on Linux and macOS THEN the documented Claude/Codex slice SHALL pass without a hosted coordination account or subscription, and a new agent profile SHALL not require a core schema change.

## Canonical MVP validation slice

1. The developer starts the local daemon and UI in a test repository, then starts one supported Claude Code session and two supported Codex sessions. All three register using configured role bindings.
2. The Lead creates two tasks with disjoint expected file scopes, complete context, acceptance criteria, and no dependency between them.
3. Both Workers are already in the bounded-wait activation loop. Each atomically claims one task and receives a distinct core-created worktree.
4. Both Workers make changes concurrently, post progress, renew their leases, attach passing test evidence and paired usage checkpoints, and reach `merge_ready` without human relay.
5. The Lead, waiting through the same bounded-wait activation loop, receives each `merge_ready` task, reviews both, and moves each approved task to `awaiting_human_approval`.
6. The developer approves each merge in the UI. The core merges the branches sequentially and records the outcomes.
7. A separate negative-path run intentionally creates a claim collision, an expired lease, and a merge conflict. Exactly one claimant wins; the expiry follows the safe recovery policy; and the conflict blocks and alerts without autonomous resolution.
8. The dashboard and event history reflect every accepted transition. The measured execution interval contains zero human copy-paste, wake-up commands, status polls, or manual worktree commands.

## Out of scope

- Cross-machine agents, multiple human users, remote access, authentication, and access control.
- Fully autonomous operation without human merge authority.
- Autonomous LLM merge-conflict resolution.
- Accurate or normalized cross-vendor token telemetry, cost optimization, budget enforcement, or automatic model routing.
- Concurrent agents editing one working tree.
- A full drag-and-drop project-management UI.
- Automatically launching or terminating agent CLIs.
- Automatically spawning the daemon through lockfiles or sockets.
- OpenCode, Kimi, Cursor, and other clients in the MVP compatibility test matrix.
- A full-board MCP tool.
- Cloud synchronization, hosted accounts, or collaboration state leaving the machine.
- Windows support, including Windows-specific worktree and process behavior.

## Dependencies

- A supported Git installation with worktree support and a repository whose filesystem permits sibling task worktrees.
- SQLite or an equivalent embedded transactional store selected by architecture.
- An MCP server SDK and client behavior compatible with bounded long-polling.
- Streamable local updates for the UI, with the exact HTTP/WebSocket technology selected by architecture.
- Installed and authenticated Claude Code and Codex CLIs for the canonical end-to-end validation. Their model-provider connectivity is external to the substrate.
- Reproducible activation-spike coverage or a replacement integration harness that tests bounded timeout, cancellation, retry, and repeated handoffs.

## Resolved product decisions

- **Lease-expiry recovery:** clean worktrees are automatically requeued; worktrees containing changes become blocked until explicit human reassignment.
- **Conflict recovery:** the human resolves conflicts outside the product, then uses the UI to retry the merge after core validation.
- **Initial platforms:** Linux and macOS are supported; Windows is out of scope for the MVP.

## Open questions

- **[OQ-01] Final product name — owner: Ishmam; non-blocking before public release.** Continue with AgentBus as a codename or select a name that emphasizes shared state and worktrees.

## Ready for architecture?

**Yes.** The remaining working-name question is not an architecture blocker. Architecture must define the task state machine, transaction boundaries, lease fencing, worktree recovery mechanics, bounded-wait parameters, API/MCP contracts, event projections, Git merge strategy, and platform-specific process behavior while preserving the requirements above.
