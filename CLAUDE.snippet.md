<!-- forge-swe:begin -->
# Forge SWE operating contract

Objective rules the forge-swe agents and workflows rely on. Merged into CLAUDE.md / AGENTS.md by `npx forge-swe init`.

## Operating principles

1. **Typed artifacts beat chat.** Planning outputs go in `docs/<type>/<slug>.md`, generated from `templates/`. Artifacts are the handoff medium between agents and survive context resets.

2. **Architect → Editor split.** Non-trivial implementation uses a high-reasoning architect to plan against a story, then an implementer to apply diffs. `/implement` orchestrates this.

3. **Stories are self-contained.** Each story embeds its slice of architecture, acceptance criteria, and relevant repo-map references — enough that any agent can pick it up cold.

4. **Brownfield starts with the repo map.** Run `/brownfield:onboard` once per repo to seed `REPOMAP.md`. Other agents reference it instead of re-deriving structure.

5. **Reviews fan out in parallel.** `/review` invokes `code-reviewer`, `security-auditor`, `perf-auditor` concurrently. Aggregate findings by severity, not by reviewer.

6. **Right-size the work.** Match artifact depth to scope. The complexity determines the depth, not a fixed pipeline.

   | Scope | Use | Example |
   |---|---|---|
   | **Small** (≤3 files, ≤1 hour, one clear change) | Skip PRD/architect. `/brownfield:bugfix` or direct edit. Emit a 3-line inline plan before the first edit. | Fix a null-pointer in `parseConfig`. |
   | **Medium** (one story file, half-day to two days) | `/story` then `/implement`. | Add an endpoint and its tests. |
   | **Large** (multiple stories, requires design) | Full PRD → architecture → stories → `/implement` per story. | New feature surface. |
   | **Complex** (cross-system, high uncertainty) | Add `/challenge` between architecture and stories. Spike if novel. | Migration touching writers and readers; new auth model. |

   **Safety valve:** if a "small" task reveals more than 5 atomic steps during implementation, STOP and create a formal story file.
   **ADR trigger (any tier):** record an ADR (`/adr`) when a change introduces/replaces an external dependency, alters a contract used in 3+ places, changes data flow or persistence, adds an architectural layer, or commits to one of several viable designs. See `/adr` for the full matrix.

7. **Disciplines are skills.** Cross-cutting methods live in `.claude/skills/` and load on trigger: `test-driven-development` (the RED→GREEN→REFACTOR discipline behind `implementer`/`test-author`), `systematic-debugging` (the method behind `debugger`/`/brownfield:bugfix`), `skill-authoring` (the checklist behind adding/editing any agent, command, or skill). Agents reference the skill rather than restating it.

## Conventions

- Artifacts live in `docs/<type>/<slug>.md` (e.g. `docs/prd/payments-redesign.md`).
- Stories: `docs/stories/<NNN>-<slug>.md` (zero-padded, sequential). ADRs: `docs/adrs/<NNNN>-<slug>.md`. Postmortems: `docs/postmortems/<YYYY-MM-DD>-<slug>.md`. Learnings: `docs/learnings/<YYYY-MM-DD>-<slug>.md`.
- Agents are role nouns (`architect.md`); commands are verbs or namespaced (`/implement`, `/greenfield:prd`); skills are disciplines (`test-driven-development/`).
- **Frontmatter `description:` must follow** `[What it does] + [Use when "<trigger phrase>"] + [Do NOT use for X]`. Negative triggers prevent overlap; without them, auto-selection blurs.
- **Model-invoked vs. user-invoked.** A skill (`.claude/skills/`) is model-invoked — reached by trigger-match, never called by name. A command or agent is user-invoked — reached only by explicit reference (a typed `/command`, or an agent naming another agent to spawn). A user-invoked surface never triggers another user-invoked surface by pattern-matching; it can only name it explicitly. See the `skill-authoring` skill before adding or editing any of the three.
- **Deferred-corner marker.** When you deliberately cut a corner mid-implementation (not a stub — a real but intentionally-limited solution), leave `# scope: <what was deferred>, <trigger to revisit>` at the site. `/review` and `/ship` grep for these and surface any left unresolved before a PR — cheaper than an ADR for something that isn't yet a durable decision.
- **Rejected-request ledger.** `docs/out-of-scope/<slug>.md` holds asks that were deliberately descoped or rejected (one file per ask, one-line reason + date). `analyst` and `pm` check it before drafting a new brief/PRD so the same ask isn't re-litigated from scratch.

## What not to do

- Don't skip the story file for non-trivial work — it's the context container.
- Don't manually copy template content; commands handle instantiation.
- Don't write code in the architect step or design in the implementer step — keep the split clean.
- Don't bypass `/brownfield:onboard` for an unfamiliar repo.

Bias: caution over speed on non-trivial work.

## Knowledge verification chain

When a question can't be answered from this conversation alone, consult sources in this order. Stop at the first that resolves it.

1. **Codebase.** Read the files. Grep for the symbol or string.
2. **Project docs.** `docs/architecture/`, `docs/adrs/`, `REPOMAP.md`, story files, `docs/learnings/`.
3. **Context7 MCP** (`mcp__plugin_context7_context7__*`) for library/framework docs. Prefer this over guessing — knowledge cutoffs are real.
4. **Web search / fetch.** Recent activity, community signal, breaking changes.
5. **Flag as uncertain and ask the user.** Always an option. Uncertainty beats fabrication.

Applies especially to `analyst`, `tech-researcher`, `architect`, `debugger`.

## Sub-agent delegation matrix

The architect→editor split is one instance of a broader rule: delegate context-heavy or parallelizable work; keep judgment in main context.

| Delegate to a sub-agent | Keep in main context |
|---|---|
| Research / library comparison (returns: shortlist + tradeoff) | Planning, sequencing, prioritization |
| Implementation against a fixed plan (returns: diff) | Task creation, story decomposition |
| Parallel reviews (returns: tagged findings) | Validation of those findings against original intent |
| Repo mapping (returns: REPOMAP.md) | Architectural decisions that depend on it |
| Debugging spike (returns: reproduction + root cause) | The fix decision and the test design |

Sub-agents get their full prompt in the invocation — they can't see this conversation. State the goal, constraints, inputs, expected output shape, and where to write artifacts.

## Rules

**1 — Think before coding.** State assumptions explicitly. Ask rather than guess. Push back when a simpler approach exists. Stop when confused.

**2 — Simplicity first.** Minimum code that solves the problem. Nothing speculative. No abstractions for single-use code.

**3 — Surgical changes.** Touch only what you must. Match existing style; don't refactor what isn't broken. Remove imports/variables/functions YOUR changes orphaned. Don't delete pre-existing dead code unless asked. Every changed line traces to the request.

**4 — Goal-driven execution.** Define success criteria. Loop until verified. Strong criteria let Claude loop independently.

**5 — Use the model only for judgment calls.** Use for classification, drafting, summarization, extraction. NOT for routing, retries, deterministic transforms. If code can answer, code answers.

**6 — Token budgets are not advisory.** Per-task ~4,000 tokens; per-session ~30,000. Approaching budget → summarize and start fresh. Surface the breach; don't silently overrun.

**7 — Surface conflicts, don't average them.** If two patterns contradict, pick one (more recent / more tested), explain why, flag the other for cleanup.

**8 — Read before you write.** Before adding code, read exports, immediate callers, shared utilities. If unsure why existing code is shaped a certain way, ask.

**9 — Tests verify intent, not just behavior.** A test must encode WHY behavior matters, and must fail when business logic changes. Not a passing test: one that is skipped, asserts something always-true (`expect(true).toBe(true)`), matches 0 cases, or has a placeholder body. "Tests pass" is false if any shipped test is one of these. (See the `test-driven-development` skill.)

**10 — Checkpoint, and plan before multi-step work.** Before a multi-step change, emit a short `PLAN:` block (numbered steps, each with how it'll be verified) and proceed unless redirected. After each significant step, summarize what's done, verified, and left. Don't continue from a state you can't describe back.

**11 — Match the codebase's conventions, even if you disagree.** Conformance > taste inside the codebase. If a convention is harmful, surface it; don't fork silently.

**12 — Fail loud.** "Completed" is wrong if anything was skipped silently. "Tests pass" is wrong if any were skipped. Surface uncertainty; don't hide it.
<!-- forge-swe:end -->
