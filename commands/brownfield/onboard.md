---
description: Onboard to an existing repo — build REPOMAP.md and produce a first-impressions summary.
---

Invoke the `repo-mapper` subagent. It will:
1. Survey repo structure, language(s), build/test/run commands.
2. Identify the architectural pattern.
3. Identify load-bearing files.
4. Write `REPOMAP.md` at repo root using `${CLAUDE_PLUGIN_ROOT}/templates/repomap.tmpl.md`.

After the map is written, give the user a 5-line "first-impressions" summary:
- What this codebase is.
- Primary language(s) and framework(s).
- How to build/test/run locally.
- The architectural pattern in one sentence.
- The single most important thing to know before touching it.

