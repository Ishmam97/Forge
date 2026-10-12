---
name: agentic-swe-workflows
description: Run forge-swe Codex workflows for brainstorm, greenfield, brownfield, implement, review, ship, learn, challenge, ADRs, migrations, releases, postmortems, checkpoints, and stories. Use when the user names an forge-swe slash-command-style workflow such as "/implement", "brownfield:onboard", or "ship". Do NOT use for ordinary coding tasks that do not need the scaffold workflow.
---

# forge-swe Workflows for Codex

This skill is the Codex bridge for the scaffold's Claude slash-command workflows. Codex repository prompts are modeled as skills, so each workflow lives as a resource file under `resources/commands/`.

## How to run a workflow

1. Resolve the requested workflow name. Treat a leading slash as optional: `/implement`, `implement`, and `forge-swe implement` all mean the same workflow.
2. Treat the remaining user text as `$ARGUMENTS` for the selected resource.
3. Read only the matching resource file and follow it as the workflow prompt.
4. When a resource says to invoke a subagent, spawn the matching Codex custom agent from `.codex/agents/<name>.toml` when subagents are available. If the current Codex surface cannot spawn agents, perform the role inline and state that fallback.
5. When a resource refers to another slash command, route to that workflow through this same skill.
6. Keep generated artifacts in `docs/`, and `REPOMAP.md` exactly as the resource specifies.

## Workflow Routing

| Workflow | Purpose | Resource |
|---|---|---|
| `adr` | Write an Architecture Decision Record for a specific decision. | `resources/commands/adr.md` |
| `aside` | Answer a side question without losing your place on the current task. Never modifies files. | `resources/commands/aside.md` |
| `brainstorm` | Explore a rough idea through structured one-question-at-a-time dialogue before any brief or PRD exists. Use when "I have an idea for...", "what if we built...", "help me think through...". Do NOT use when requirements are already clear — go straight to `/greenfield:prd` or `/greenfield:brief`. | `resources/commands/brainstorm.md` |
| `brownfield:bugfix` | Triage and fix a bug — debugger first, then minimum-change fix and regression test. | `resources/commands/brownfield/bugfix.md` |
| `brownfield:feature` | Add a new feature to an existing repo. Runs PRD → architecture delta → stories. | `resources/commands/brownfield/feature.md` |
| `brownfield:onboard` | Onboard to an existing repo — build REPOMAP.md and produce a first-impressions summary. | `resources/commands/brownfield/onboard.md` |
| `brownfield:refactor` | Propose and apply a refactor (behavior-preserving change). | `resources/commands/brownfield/refactor.md` |
| `challenge` | Stress-test a plan, architecture, or PRD by running the devils-advocate agent against it. Steelman first, then critique. | `resources/commands/challenge.md` |
| `checkpoint` | Create, list, or restore a named workflow checkpoint (git stash + log entry). Useful before risky work. | `resources/commands/checkpoint.md` |
| `greenfield:architect` | Produce an architecture document for a feature or project. | `resources/commands/greenfield/architect.md` |
| `greenfield:brief` | Produce a project brief from an idea via the analyst agent. | `resources/commands/greenfield/brief.md` |
| `greenfield:kickoff` | Kick off a new project from a one-line idea. Runs analyst → PM → architect → planner → scaffold proposal, with user checkpoints between steps. | `resources/commands/greenfield/kickoff.md` |
| `greenfield:prd` | Produce a PRD from an existing brief (or a clear request). | `resources/commands/greenfield/prd.md` |
| `greenfield:scaffold` | Generate the initial project skeleton from an architecture doc. | `resources/commands/greenfield/scaffold.md` |
| `implement` | Implement a story using the architect→editor split. | `resources/commands/implement.md` |
| `learn` | Capture a lesson as a typed artifact in docs/learnings/ so future sessions can find it. Use when "save this lesson", "/learn", "remember this for next time". Do NOT use for routine session logs or anything already in AGENTS.md / an ADR. | `resources/commands/learn.md` |
| `migrate` | Plan a database migration, data backfill, or API version transition. | `resources/commands/migrate.md` |
| `postmortem` | Produce a blameless postmortem for an incident or significant bug. | `resources/commands/postmortem.md` |
| `release` | Cut a release — version bump, changelog, release notes, checklist. | `resources/commands/release.md` |
| `review` | Multi-agent review of the current branch — code, security, performance — in parallel. | `resources/commands/review.md` |
| `ship` | Final pre-PR gate — stub scan, verification of tests/lint, story acceptance, docs, PR body. Use when "is this ready to ship", "prep the PR", before opening a PR. Do NOT use to push or open the PR — that stays with the user. | `resources/commands/ship.md` |
| `story` | Create a single story file with full context for implementation. | `resources/commands/story.md` |

## Codex surface mapping

| Claude scaffold term | Codex equivalent |
|---|---|
| `CLAUDE.md` | `AGENTS.md` |
| `.claude/agents/*.md` | `.codex/agents/*.toml` |
| `.claude/skills/*/SKILL.md` | `.agents/skills/*/SKILL.md` |
| `.claude/commands/**/*.md` | this skill's `resources/commands/**/*.md` |
| `.mcp.json` | `.codex/config.toml` for Codex, `.mcp.json` for Claude Code |

