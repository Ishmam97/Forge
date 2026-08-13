# ADR 0002: Core-Owned Worktrees and Human-Gated Integration

**Status:** Proposed
**Date:** 2026-08-13
**Deciders:** AgentBus maintainers

## Context

Parallel coding agents must not modify the same working tree. Agent-created paths and shell commands are unsafe and unauditable, while worktree isolation alone does not make merges safe. The developer must retain final merge authority.

## Decision

Only the core daemon creates, records, cleans up, and invokes Git for task worktrees. It derives branch and directory names from internal repository and task identifiers, invokes Git with argument arrays (never a shell), and returns an absolute path only after provisioning succeeds. On explicit UI approval after Lead review, the core merges one task at a time in a dedicated detached integration worktree, then atomically advances the configured integration ref. Conflicts block the task; the human resolves them in that integration worktree and asks the UI to validate and finish the recorded merge. Agents never receive merge authority.

## Alternatives considered

- **One shared working tree with file ownership rules:** cannot prevent accidental concurrent writes and makes cleanup/recovery ambiguous.
- **Agent-created worktrees:** lets a hallucinated or malformed path escape repository policy and makes lifecycle tracking unreliable.
- **Automatic agent conflict resolution:** may produce plausible but unsafe integration changes and violates the required human gate.
- **Core-owned worktrees with human-gated integration (chosen):** uses Git's established isolation primitive and makes all destructive actions observable and controllable.

## Consequences

**Positive:**

- Workers receive isolated, auditable locations and cannot select arbitrary filesystem paths.
- The developer's primary worktree is never used as the integration workspace.
- Merge authority and conflict recovery remain explicitly human controlled.

**Negative / tradeoffs accepted:**

- Git provisioning and merges are serialized per repository and can be slower than direct edits.
- Conflict resolution requires the developer to use the recorded integration worktree.
- Worktrees with uncommitted changes are retained rather than automatically reclaimed.

**Neutral / follow-ons required:**

- Add platform-specific integration tests for Linux and macOS Git behavior.
- Document cleanup and recovery in a runbook before public release.

## References

- [PRD: Cross-Agent Collaboration MCP](../prd/cross-agent-collaboration-mcp.md)
- [Architecture: Cross-Agent Collaboration MCP](../architecture/cross-agent-collaboration-mcp.md)
