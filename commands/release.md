---
description: Cut a release — version bump, changelog, release notes, checklist.
argument-hint: "<optional: explicit version like v1.2.0>"
---

Release context:

> $ARGUMENTS

Invoke the `release-manager` subagent. It will:
1. Determine the version bump from `git log <last-tag>..HEAD` (or validate the version the user provided).
2. Update `CHANGELOG.md` (using `${CLAUDE_PLUGIN_ROOT}/templates/changelog.tmpl.md` if creating fresh), grouped into Added / Changed / Fixed / Removed / Deprecated / Security.
3. Bump the version in the canonical project file (`package.json`, `pyproject.toml`, `Cargo.toml`, etc.).
4. Draft human-readable release notes (separate from raw changelog).
5. Output the pre-release checklist.

The release-manager does **NOT** tag or push. After it finishes, review its output and tag/push manually (or ask Claude to, with explicit approval).
