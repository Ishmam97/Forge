# forge-swe

https://www.ishmamsolaiman.com/forge

A light library of software-engineering agents, workflows and skills for **Claude Code** and **Codex**. Pull in everything, or just the pieces you want.

- **20 agents** — analyst, pm, architect, planner, implementer, test-author, code-reviewer, security-auditor, perf-auditor, debugger, refactorer, docs-writer, repo-mapper, migration-planner, release-manager, committer, data-modeler, devils-advocate, tech-researcher, learnings-researcher
- **22 workflows** — `/brainstorm`, `/implement`, `/review`, `/ship`, `/adr`, `/greenfield:*`, `/brownfield:*`, and more
- **3 skills** — `test-driven-development`, `systematic-debugging`, `skill-authoring`
- **Templates** — PRD, architecture, story, ADR, migration plan, postmortem, and others, instantiated into `docs/`
- **Operating contract** — the rules the agents rely on, merged into your `CLAUDE.md` / `AGENTS.md`

## Install

### Claude Code plugin

```
/plugin marketplace add Ishmam97/Forge
/plugin install forge-swe@forge-swe
```

### Installer (Claude Code and Codex, pick and choose)

```bash
npx github:Ishmam97/Forge list                       # what's available
npx github:Ishmam97/Forge add implementer debugger   # specific items + their dependencies
npx github:Ishmam97/Forge add implement --claude     # a workflow, Claude Code only
npx github:Ishmam97/Forge init                       # everything
```

`add` follows references, so `implement` also pulls in `implementer`, `architect`, `test-author`, the `test-driven-development` skill and the templates they use. Existing files are never overwritten unless you pass `--force`. Files land in `.claude/` (Claude Code) and `.codex/` + `.agents/skills/` (Codex), templates in `templates/`.

## Start

| You want to… | Run |
|---|---|
| Explore a rough idea | `/brainstorm "<idea>"` |
| Start a new project | `/greenfield:kickoff "<idea>"` |
| Understand an existing repo | `/brownfield:onboard` |
| Build a story | `/implement <story>` |
| Fix a bug | `/brownfield:bugfix "<bug>"` |
| Review, then finalize a PR | `/review` → `/ship` |

In Codex, ask for workflows by name: `forge-swe implement <story>`.

## Design

Typed artifacts over chat; an architect → implementer split; self-contained stories; reviews that fan out in parallel; disciplines as skills. Full rules are in `CLAUDE.snippet.md`.

## Not included

The full Forge toolkit (in development) adds an Obsidian memory vault, session hooks and the `agentbus` multi-agent coordinator. This library leaves those out to stay small.

> Generated from the full repo by `scripts/build-light.mjs`. Edit the source there, not here.
