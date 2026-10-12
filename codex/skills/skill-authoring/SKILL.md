---
name: skill-authoring
description: Use before writing or editing anything under .agents/skills/, .codex/agents/, or .agents/skills/agentic-swe-workflows/resources/commands/ — checks invocation scope and runs a failure-mode pass. Triggers on "write a skill", "add a new agent/command", "author a skill", "review this SKILL.md". Do NOT use for using an existing skill/agent/command, only for authoring or editing one.
---

# Skill Authoring

Disciplines for adding to this scaffold's `.agents/skills/`, `.codex/agents/`, and `.agents/skills/agentic-swe-workflows/resources/commands/` without degrading it. Distilled from auditing external skill collections (ponytail, caveman, mattpocock/skills) against this scaffold's own conventions.

## 1. Pick the invocation scope first

Every capability in this scaffold is one of two things, and the choice determines how much its `description` needs to work:

- **Model-invoked (a skill, `.agents/skills/<name>/SKILL.md`).** Reached by trigger-match against `description` — the model decides to load it from context, unprompted. The description *is* the router: it must carry rich trigger phrasing plus an explicit "Do NOT use for X" negative clause, per AGENTS.md's frontmatter rule. Get this wrong and the skill either never fires or fires when it shouldn't.
- **User-invoked (a command, `.agents/skills/agentic-swe-workflows/resources/commands/**.md`, or a named agent).** Reached only by literal reference — the user types `/review`, or an agent/command explicitly names another agent to spawn. The description is documentation for a human/router picking from a list, not a semantic trigger.

**Rule: a user-invoked surface never triggers another user-invoked surface by pattern-matching.** A command can *name* another command explicitly ("then run `/ship`") — that's an explicit reference, not a trigger-match. It must never rely on the second command's description resembling something the first command's output said. If you find yourself writing "this should also fire when X happens" for a command, that's a sign X belongs in a skill instead.

## 2. Failure-mode pass before shipping a skill/agent/command

Run down this list on anything you're adding or editing. Named so they're checkable, not vibes:

- **Premature completion** — does the instruction let the agent declare success before verifying? (Rule 4/12 already forbid this generally; check the specific skill doesn't reintroduce it.)
- **Duplication** — does this restate something AGENTS.md, another skill, or an agent file already states? Reference it (a plain path reference) instead of copying.
- **Sediment** — is there an instruction here that used to matter but no longer applies to how this scaffold actually works? Stale conditionals accumulate silently; delete them, don't just add around them.
- **Sprawl** — is the file trying to cover more than one discipline? A skill earns its `description` real estate only if it's one coherent trigger condition. Split it if it isn't.
- **No-op instructions** — does every line change what the agent actually does, or is some of it restating the obvious ("be thorough", "do a good job")? Cut anything that wouldn't change behavior if removed.
- **Negation** — telling the model *not* to do X makes X more salient, not less. State the positive target ("write the minimum diff that satisfies the story's acceptance criteria") instead of the prohibition ("don't over-engineer") wherever you can.

## 3. Keep the mirror in sync

Agents, commands, and skills are the source of truth in `.claude/`; `.codex/` and `.agents/skills/` are generated from them. After editing any of `.codex/agents/`, `.agents/skills/agentic-swe-workflows/resources/commands/`, or `.agents/skills/`, run:

```bash
node scripts/sync-codex-support.mjs
```

If the new skill should also exist for Codex (most should), add its name to `managedSkills` in `scripts/sync-codex-support.mjs` first.
