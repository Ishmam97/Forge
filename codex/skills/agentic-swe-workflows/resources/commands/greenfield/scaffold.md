---
description: Generate the initial project skeleton from an architecture doc.
argument-hint: "<architecture slug>"
---

Read `docs/architecture/$ARGUMENTS.md`.

Propose the project skeleton:
- Directory layout.
- Key config files (build, lint, format, test).
- Initial entry points.
- Initial test setup.
- A first-cut top-level `README.md`.

**Confirm the proposal with the user before writing any files.** Show the planned tree as a code block.

After the user approves:
1. Create the skeleton files.
2. Run install/build/test commands to verify the skeleton works.
3. Invoke the `repo-mapper` subagent to produce `REPOMAP.md`.
4. Offer to run `/implement` on the first story in `docs/stories/`.
