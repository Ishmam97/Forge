# PRD: <Feature/Product Name>

**Status:** Draft | Approved | In Progress | Shipped
**Owner:** <PM>
**Date:** YYYY-MM-DD
**Brief:** [link to brief if applicable]

## Problem and context
Why are we building this? Link to brief.

## Users and use cases
Primary user(s). Top 3-5 use cases.

### Personas
Two bullets per persona — goals and pain points. Demographics are not required; specific JTBD is.

- **Persona A — `<name/role>`**
  - Goals: ...
  - Pain points: ...
- **Persona B — `<name/role>`**
  - Goals: ...
  - Pain points: ...

## User stories
- US1: As a `<role>`, I want to `<action>`, so that `<outcome>`.
- US2: ...

## Functional requirements
Each FR carries a MoSCoW priority tag and a traceability ID.

- **[CATEGORY-01] [MUST]** `<testable behavior>`
- **[CATEGORY-02] [SHOULD]** ...
- **[CATEGORY-03] [COULD]** ...
- **[CATEGORY-04] [WONT]** (out of scope for this version; recorded for visibility) ...

`CATEGORY` is a short uppercase noun for the area (e.g. `AUTH`, `CHECKOUT`, `BILLING`). IDs flow into architecture sections, story files, and tests.

## Non-functional requirements
- **NFR1 (Performance):** e.g. p95 < 200ms at 1k req/s
- **NFR2 (Security):** ...
- **NFR3 (Observability):** ...
- **NFR4 (Availability):** ...
- **NFR5 (Cost):** ...

## Acceptance criteria
Per user story, the conditions that mean it's done. Use **WHEN/THEN/SHALL** form and echo the relevant requirement IDs.

**US1:**
- [ ] [CATEGORY-01] WHEN `<situation>` THEN the system SHALL `<observable outcome>`.
- [ ] [CATEGORY-02] WHEN `<situation>` THEN the system SHALL `<observable outcome>`.

**US2:**
- [ ] [CATEGORY-03] WHEN `<situation>` THEN the system SHALL `<observable outcome>`.

If a criterion can't be written as a WHEN/THEN/SHALL clause that a test could check, rewrite it until it can.

## Out of scope
Explicit non-goals for this version.

## Dependencies
External services, teams, decisions this depends on.

## Open questions
Each tagged with: who can answer + by when.

## Ready for architecture?
Yes / No.
