---
type: concept
status: active
created: '2026-06-26'
updated: '2026-08-13'
tags:
  - concept
  - mcp
  - feasibility-risk
  - resolved
related:
  - '[[Cross-Agent Collaboration MCP]]'
  - '[[Cross-Agent MCP - Multi-Agent Review Consensus]]'
  - '[[Parallel Coding-Agent Orchestration Landscape]]'
---
# MCP Long-Running Tool Call Activation — Spike Resolution

The riskiest assumption in [[Cross-Agent Collaboration MCP]] was its **blocking long-poll activation** (`wait_for_my_next_task()` — an agent parks on a held-open MCP tool call until work exists). Research suggested client timeouts would make it infeasible, but a 2026-06-26 spike against the actual MVP clients did not reproduce that failure.

## Original risk

Other MCP-client evidence suggested hard tool-call timeouts could kill a held-open call: Cursor was reported to time out around 60 seconds, and Claude Code issue #58687 described progress notifications failing to extend long-running calls. Those reports were valid reasons to spike the actual proving clients, but they were not sufficient evidence to reject the design.

A separate behavioral risk remains broader than transport compatibility: arbitrary agent CLIs may not reliably wait, resume, and re-call without profile-specific prompting. The MVP therefore proves this behavior only for its documented Claude Code and Codex versions.

## The standards-track signal

MCP's own answer to long-running work is **not** a held-open call — it's the **Tasks** primitive: `tools/call` returns a *task handle*, client drives `tasks/get` polling ("call-now, fetch-later"). Experimental in spec `2025-11-25`, moving to an **extension** in the `2026-07-28` release candidate. So the protocol direction is poll-based; client support (esp. Codex) is still unproven.

## Spike result and decision

A probe MCP server exercised 130-second held-open calls against headless **Claude Code 2.1.193** and **Codex 0.142.0**. All tested combinations returned cleanly, no progress notifications were required, and both agents parked on the explicit wait instruction.

The MVP adopts **configurable bounded long-poll**: the server returns work or an explicit empty timeout at a conservative bound, and the supported agent profile re-calls without human intervention. Short-poll and MCP Tasks remain fallback designs if client behavior regresses.

Architecture must specify the bound, cancellation/resource cleanup, retry behavior, lease separation, and version compatibility. End-to-end tests must cover repeated wait/return/re-call cycles, not only one prompted call. The spike proves the initial clients at the tested versions, not all MCP clients or an unlimited wait ceiling.

See the durable learning: `docs/learnings/2026-06-26-mcp-blocking-tool-call-activation.md`.

## Related

- [[Cross-Agent Collaboration MCP]] · [[Cross-Agent MCP - Multi-Agent Review Consensus]] · [[Concepts MOC]]
