# Story <NNN>: <Title>

**Status:** Draft | Ready | In Progress | Done
**PRD:** [link]
**Architecture:** [link to section]
**Estimate:** <hours/days>
**Depends on:** <story numbers, or none>

## Goal
One sentence. What ships.

## Architectural context
Quoted slice of the architecture doc relevant to this story. Include the relevant components, the data flow segment, and any contracts this story implements. (This makes the story survive `/clear`.)

## Affected files
From `REPOMAP.md` (for brownfield) or the scaffold plan (for greenfield). One line per file describing the kind of change. Pair each implementation file with its test file when the convention applies.

- `path/to/file.ext` — <add | modify | delete>: <one-line description>
- `path/to/file_test.ext` — <add | modify>: <one-line description>

## Acceptance criteria
Use **WHEN/THEN/SHALL** form and echo the Requirement Traceability IDs from the PRD. Flip `- [ ]` → `- [x]` as each is satisfied during implementation.

- [ ] `[CATEGORY-NN]` WHEN `<situation>` THEN the system SHALL `<observable outcome>`.
- [ ] `[CATEGORY-NN]` WHEN `<situation>` THEN the system SHALL `<observable outcome>`.

## Test plan
Tests are written **in this story**, not as a separate follow-up story. The implementer is responsible for them.

- **Happy path:** ...
- **Edge cases:** ... (walk the test-author taxonomy: null/empty/invalid/boundary/error/race/large-data/special-chars; include the ones that apply.)
- **Error paths:** ...
- **Regression:** if fixing a bug, the test that fails on old code and passes on new.

## Out of scope
Things adjacent to this story that aren't part of it.

## Notes for implementer
Subtle constraints, prior decisions, or "watch out for X" that an implementer wouldn't derive from the files alone.
