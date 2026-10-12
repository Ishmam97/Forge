---
description: Explore a rough idea through structured one-question-at-a-time dialogue before any brief or PRD exists. Use when "I have an idea for...", "what if we built...", "help me think through...". Do NOT use when requirements are already clear — go straight to `/greenfield:prd` or `/greenfield:brief`.
argument-hint: "<rough idea>"
---

Rough idea to explore:

> $ARGUMENTS

## How to handle this

### 0. Scope check before the first question
If `REPOMAP.md` exists, read it (brownfield context). If the idea spans multiple independent subsystems ("a platform with auth, billing, and analytics"), say so now — don't burn questions refining an under-scoped plan. Help the user name the sub-scopes, agree which one to brainstorm first, then proceed on that one.

### 1. Ask questions one at a time
**One question per message. Stop generating after the question mark. Wait for the answer before the next question.** This pause-for-input rule is load-bearing — bundling questions produces shallow answers that hide the real constraints.

Prefer multiple choice when the answer space is bounded, and attach a confidence read + a guessed default so the user can correct a wrong guess faster than generating an answer from scratch:

> Who's the primary user? I'd guess **B** (internal operators) — correct me if not.
> A) End consumers  B) Internal operators  C) Developers / API callers  D) Other

Aim questions at: who has the problem, what the problem actually is, what success looks like, the hard constraints, and what this explicitly will NOT do. Apply YAGNI pressure — when the user proposes something not required for the core problem, surface the assumption and push back rather than absorbing it silently.

Stop asking once you can state the problem, the user, the shape of the solution, and the key constraints **without guessing**.

### 2. Propose 2–3 approaches
Concrete options with trade-offs. Lead with your recommendation and why. Be specific about cost — complexity, dependencies, reversibility. Don't hedge without a reason.

### 3. Self-review the summary before showing it
Quick internal pass: **placeholder scan** (resolve or flag every "TBD"), **internal consistency** (approaches don't contradict what you elicited; scope matches the non-goals), **scope check** (focused enough for one brief, or needs decomposition). Fix silently; surface only what you can't resolve.

### 4. Present the design-exploration summary
- **Problem** — what's broken/missing, for whom.
- **Who it's for** — a specific user type, not "everyone".
- **Approach** — the chosen direction and why, in 2–4 sentences.
- **Key decisions** — the choices that constrain implementation.
- **Open questions** — what's still unresolved.
- **Non-goals** — what this explicitly excludes.

Scale depth to complexity: a paragraph per section for a simple idea, more for a complex one.

### 5. Offer the next step (then wait)
> **Where next?**
> A) `/greenfield:brief` — write the formal brief in `docs/briefs/` (recommended if requirements still need review)
> B) `/greenfield:prd` — straight to PRD if scope is clear enough

Do not write a formal `docs/` artifact yourself — the brief and PRD commands own those. The exploration summary is this command's output.

## What not to do

- Don't bundle questions. One question, one message, full stop.
- Don't silently absorb speculative scope — name it as a non-goal or push back.
- Don't write a brief or PRD yourself; hand off to the commands that own those artifacts.
- Don't invoke any implementation skill, write code, or scaffold anything.
- Don't present the summary until you can state problem, user, approach, and non-goals without guessing.
- Don't run this when requirements are already clear — use `/greenfield:prd` directly.
