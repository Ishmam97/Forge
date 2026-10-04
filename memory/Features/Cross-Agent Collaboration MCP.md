---
type: feature
status: in-progress
created: '2026-06-26'
updated: '2026-08-19'
tags:
  - feature
  - mcp
  - multi-agent
  - collaboration
  - open-question
related:
  - '[[Cross-Agent MCP - Multi-Agent Review Consensus]]'
  - '[[Cross-Agent MCP - Agent-Agnostic by Design]]'
---
# Cross-Agent Collaboration MCP

A local-first coordination substrate that lets heterogeneous coding agents (Claude Code, Codex, OpenCode, Kimi, …) share a task board, message each other, and collaborate on one repo without a human relaying state between terminals. Brainstormed 2026-06-26; sharpened by a multi-agent review (see [[Cross-Agent MCP - Multi-Agent Review Consensus]]); PRD, architecture, ADRs, and Story 001 were drafted by 2026-08-13. Story 001 implementation is now in progress.

**Working name:** unresolved. `AgentBus` (provisional) reads as a message-transport layer, but the architecture's real strength is *shared state + isolated workspaces* — candidates: `WorktreeHub`, `RepoCrew`, `DevBoard`, `WorkBus`.

## Problem

A developer running several coding agents at once has no way for them to see each other's work or coordinate. Each is a siloed session with its own context, so **the human is the manual message bus** — copy-pasting state between terminals, relaying "X is done, now do Y", running agents sequentially because parallel edits clobber the same files. No shared board, no inter-agent messaging, no teams, no record of who's doing what or what it costs.

## Who it's for

A **single developer on one machine** orchestrating multiple agent CLIs locally and supervising (topology A). The substrate is designed so the same core later serves cross-machine agents (B), multiple humans (C), and autonomous swarms (D) — those are out of MVP scope but must not require a rewrite.

## Approach

A **shared local core service** (SQLite + HTTP/WebSocket daemon) is the single source of truth for a task board, messages, teams, an agent registry, and a usage ledger. Two thin clients sit on top:

- an **MCP adapter** exposing board operations as tools so *any MCP-capable agent* can participate, and
- a **UI** (thin live dashboard, web/TUI over WebSocket) so the human watches the board and reassigns.

The UI does **not** route through MCP — both MCP and UI are sibling clients of the core. Workflow is **lead-and-delegate**: a lead agent decomposes a goal into tasks, posts them, assigns to specialists; the human can override the agent↔role binding. Parallel work happens in **isolated git worktrees per task** (the core creates them), with shared context/artifacts read-only and merge as an explicit, first-class board step.

```
        ┌────────────────┐
        │  Core service   │  SQLite + HTTP/WS · append-only event log
        │ (agentbus serve)│  board · tasks · messages · teams · registry · usage ledger
        └───────┬─────────┘
        ┌───────┴─────────┐
   ┌────▼──────┐    ┌─────▼──────┐
   │MCP adapter │    │     UI     │
   │(for agents)│    │ (for human)│
   └────┬───────┘    └─────┬──────┘
   stdio│ tools           HTTP/WS│ live
   Claude Code,           dashboard
   Codex, …               + reassign
```

## Key decisions (locked)

Architectural non-negotiables (defended by every reviewer):

- **Core-as-source-of-truth.** The SQLite/HTTP daemon is the single truth; UI + MCP adapter are strictly sibling clients. Keeps the UI off the MCP spec and future multi-user cheap.
- **Worktree-per-task isolation.** The right primitive against parallel file clobbering — delegates the hard part to Git, which humans and LLMs already understand.
- **Lead-and-delegate.** A primary agent decomposes; specialists pull scoped tasks; the human can override assignment.
- **Agent-agnostic / role-pluggable.** Roles (Lead, Worker, Reviewer) are abstract; *any* agent fills *any* role; the user binds agents to roles as config. The MVP proving set (Claude Code + Codex) is a test-surface limit, **not** a design constraint. See [[Cross-Agent MCP - Agent-Agnostic by Design]].

Review-driven corrections (fold into the design):

- **Activation = blocking long-poll, not human-nudge.** Expose `wait_for_my_next_task()`; the agent parks on it and the server holds the connection open until work exists. Simulates event-driven handoff without harness-level server push. (Supersedes the earlier human-nudge MVP plan.)
- **Core owns worktrees.** Flow: agent claims task → core runs `git worktree add` → core returns the absolute path in the tool response. Agents never create their own (prevents hallucinated paths / FS collisions).
- **Merge is first-class, and worktrees only *defer* conflicts.** LLMs can't reliably resolve complex Git conflicts. MVP: the Lead enforces a sequential dependency graph or strictly orthogonal file sets. Any conflict immediately **blocks** the task and **alerts the human**.
- **Atomic claims + leases.** Claiming is a race — use compare-and-swap. Every claim gets a ~15-min lease + heartbeat; if the agent dies, the lease expires and the task reverts to Unclaimed.
- **Append-only event log**, not a mutable Kanban — for auditing, context limits, reliable state.
- **Durable identity via handshake.** env/args configure the transport/process; a first-call `register_agent_session` establishes a durable logical identity in the DB.
- **Explicit `agentbus serve`** for MVP. No auto-spawn via lockfiles/sockets (too much debugging friction for v1).
- **No "get full board" tool** (context bloat). Granular endpoints only: `get_my_assigned_tasks`, `get_task_context(id)`.

## Token handling

Collect-now, optimize-later. A **self-reporting** usage tool bookends each task (checkpoint at claim, checkpoint at done; the delta ≈ task cost) purely to prove the schema. Registry carries capability tags + cost tier + human-declared budget/limit as *schema*. **No** hard routing/budgeting logic yet — cross-agent telemetry is too inaccurate this phase. `suggest_assignee` (deterministic, over registry data) is designed-for, deferred.

## MVP success criteria (revised, post-PRD)

The testable vertical slice:

1. Start the core daemon and thin UI in a repo (`agentbus serve`).
2. Start one Claude Code session (Lead/Reviewer) and two Codex sessions (Workers); all three register through the MCP handshake using project-configured, vendor-neutral role bindings.
3. The Lead decomposes a goal into **2 disjoint tasks** with complete context, acceptance criteria, and file scopes.
4. Both Workers bounded-long-poll, each **atomic-claims** one task, and each receives a distinct **core-generated worktree path**.
5. Both Workers change code concurrently, post progress, renew leases, attach test evidence and paired self-reported usage checkpoints, and mark their tasks `merge_ready`.
6. The Lead reviews both tasks and moves approved work to `awaiting_human_approval`; Lead approval does not merge code.
7. The human explicitly approves each merge in the UI; the core attempts and records the merges sequentially. Conflicts block and alert, and a human-resolved conflict can be retried through the UI.
8. The UI reflects sessions, task states, lease health, messages, review/merge gates, rough usage, and the live event log — **no human copy-paste, wake-up/status commands, or manual worktree setup during execution**.

## Open questions

- Working name (candidates above). `AgentBus` remains the non-blocking codename. #open-question

## Product decisions resolved in the PRD (2026-08-13)

- Proving topology: one Claude Code Lead/Reviewer plus two Codex Worker sessions.
- Merge authority: Lead review is followed by explicit human approval before the core attempts a merge.
- Role binding: project configuration supplies initial vendor-neutral bindings; the human can override them through the UI.
- Lease expiry: clean worktrees requeue automatically; worktrees containing changes block until human reassignment.
- Conflict recovery: the human resolves externally and requests a validated retry through the UI.
- Platforms: Linux and macOS for MVP; Windows deferred.
- Token checkpoints: self-report only for MVP; accurate telemetry remains out of scope.

## Implementation checkpoint — 2026-08-19

Story 001 (`docs/stories/001-daemon-durable-task-ledger-and-safe-claim-foundation.md`) is **in progress**. The implemented and locally validated foundation includes repository-local SQLite/WAL state; durable sessions/tasks/events with idempotent operations; loopback daemon startup with Git-root and Windows checks; atomic two-phase core-owned worktree claims; fenced heartbeats and clean/dirty expiry recovery; task-scoped event history; and typed operation-scoped HTTP errors. The local JSON boundary currently provides session registration, task creation/detail, claim, heartbeat, and expiry reconciliation.

Checkpoints: `1b3dcda`, `f22e0dc`, `4e9136f`, `331de80`, `c972652`, `923aade`, `90dd1c7`, `3112304`, and `7088950`. At this checkpoint, TypeScript checking, production build, and 25 Vitest tests pass.

Story 001 completed 2026-08-25: validated TOML configuration/CLI `--config` wiring, schema indexes and direct close/reopen durability coverage, safe opaque Git identifiers for metadata containing shell metacharacters, and typed provisioning failures. The suite now has 30 passing Vitest tests, and TypeScript/build checks pass. Remaining MVP work is tracked in GitHub issues #4–#9: MCP long-poll, configuration/task controls, messages/evidence/usage, review/merge, UI/event stream, and canonical three-agent validation.

## Non-goals (MVP)

- Cross-machine, multi-user, auth/access control (topologies B/C) — *design for, don't build*.
- Fully autonomous, human-out-of-loop swarm (D).
- Accurate cross-agent token telemetry + token-optimized auto-routing.
- Concurrent editing of one working tree — avoided by worktrees.
- Full drag-drop Kanban UI — thin live dashboard + basic actions only.
- OpenCode / Kimi / other agents in the MVP **test matrix** (architecture supports them; proving set is Claude Code + Codex only).

## Sizing & next step

Large→Complex by the scaffold's sizing (new cross-system architecture spanning coordination state, MCP, Git, leases, and a live UI). Natural path: brief → PRD → architecture → `/challenge` → stories → `/implement`. The brief and PRD now exist; architecture is the next artifact.

## Artifacts

- Project brief: [`docs/briefs/cross-agent-collaboration-mcp.md`](../../docs/briefs/cross-agent-collaboration-mcp.md) — synthesized 2026-06-26 and reconciled after the activation spike.
- PRD: [`docs/prd/cross-agent-collaboration-mcp.md`](../../docs/prd/cross-agent-collaboration-mcp.md) — drafted 2026-08-13. **Verdict: ready for architecture**; final product naming remains open but non-blocking.

## Net-new from the brief (2026-06-26)

- **Competitive landscape mapped** → [[Parallel Coding-Agent Orchestration Landscape]]. Closest incumbent: **ReverbCode** (23-adapter daemon, worktree-per-session, SCM-observer *nudges* agents — not a shared board). Native **Claude Code Agent Teams** is the "why not built-in" answer: single-vendor, report-back-only.
- **Activation model verified for the proving clients** → [[MCP Long-Running Tool Call Activation Problem]]. A spike showed held-open calls surviving at least 130 seconds on Claude Code 2.1.193 and Codex 0.142.0, so the MVP adopts configurable bounded long-poll. Architecture must retain cancellation/retry controls and end-to-end coverage for repeated handoffs; other clients remain unverified.

## Related

- [[Cross-Agent MCP - Multi-Agent Review Consensus]] — the review that sharpened this
- [[Cross-Agent MCP - Agent-Agnostic by Design]] — the role-pluggability principle
- [[Features MOC]] · [[Decisions Log]] · [[Home]]
