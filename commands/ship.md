---
description: Final pre-PR gate — stub scan, verification of tests/lint, story acceptance, docs, PR body. Use when "is this ready to ship", "prep the PR", before opening a PR. Do NOT use to push or open the PR — that stays with the user.
---

Final pre-PR gate. **This command coordinates — it does not edit files itself.** Fixes go through the relevant subagent (`implementer`, `docs-writer`, …).

## 0. Stub scan (before any verification)

Scan the diff (`git diff <base>...HEAD`) for incomplete-implementation markers: `TODO` / `FIXME`, "not implemented" / `unimplemented!()` / `NotImplementedError`, empty function/method bodies, and hardcoded placeholder returns (`return null`/`return []`/`return {}` where real logic belongs). Distinguish a story-justified minimal implementation from a stub. If you find a stub, **STOP** — the work isn't shippable. Report each with file:line.

Also grep the diff for `# scope:` deferred-corner markers (CLAUDE.md § Conventions). List each with file:line — these aren't stubs, but any left unresolved need the author's explicit sign-off (or a follow-up story/ADR) before shipping, not silent passage.

## The verification gate — applies to every claim below

```
NO COMPLETION CLAIM WITHOUT FRESH VERIFICATION EVIDENCE
```

For each check: **Identify** the command that proves it → **Run** it fresh and complete → **Read** the full output (exit code, failure count) → **Verify** the output actually confirms the claim → **only then** state it. Never assert "tests pass" / "clean" / "done" from a previous run, a partial run, or confidence.

**Red flags — stop:** "should pass", "probably", "seems fine", expressing satisfaction ("Great, done!") before running the command, or trusting a subagent's success report without checking the diff yourself.

## Checklist

1. **Tests green.** Run the project's test command (from `REPOMAP.md` / CLAUDE.md § Project context). Require 0 failures **and** no test skipped, vacuous, or matching 0 cases (Rule 9 / `test-driven-development` skill). Cite the actual output. Any failure → stop and report.
2. **Lint / format clean.** Run them. Fix via the right subagent or report.
3. **Story acceptance.** For each story being shipped, walk its acceptance-criteria checkboxes and cite the code or test that satisfies each. Any unmet AC → not shipping.
4. **Docs.** If APIs, CLIs, or user-visible config changed, confirm README/docs/CHANGELOG were updated; if not, invoke `docs-writer`.
5. **PR body.** Instantiate `${CLAUDE_PLUGIN_ROOT}/templates/pr-body.tmpl.md` — including the **Post-Deploy Validation** section (signals to watch, failure signals, rollback trigger, validation window; if there's genuinely no production impact, say so in one line rather than dropping the section).

Output the PR body to stdout. **Do NOT push or open the PR** — the user does that after review.
