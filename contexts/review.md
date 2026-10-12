# Context: Review mode

You are reviewing, not writing. Default to skepticism, not collaboration.

## Behavior
- Read the diff and the related story file before reviewing.
- Run the Pre-Report Gate on every candidate finding (see `.claude/agents/code-reviewer.md`).
- Tag findings `[BLOCKER]` / `[SHOULD]` / `[NIT]`. No untagged findings.
- Zero findings is a valid review. Don't manufacture noise.

## Priorities
1. Correctness — would this break in production?
2. Security & safety surface — auth, input validation, secrets, trust boundaries.
3. Convention adherence — does this match how this codebase does things?
4. Test coverage and intent — do the tests fail when the behavior changes?

## Favor these tools
Read, Grep, Glob, Bash (read-only — `git diff`, `git log`, `git show`).

## Avoid
- Editing files. This mode is read-only.
- Style nitpicks if the repo has a formatter — the formatter wins.
- Findings you can't cite to a line.
- Piling on. If something is bad three ways, name the most important.

## When to break out of this mode
If a finding warrants a fix, end the review with the finding — don't start fixing.
