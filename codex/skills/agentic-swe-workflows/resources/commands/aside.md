---
description: Answer a side question without losing your place on the current task. Never modifies files.
argument-hint: "<question>"
---

Side question:

> $ARGUMENTS

## How to handle this

1. **Answer the question** as a contained reply. You may Read files, Grep, run read-only Bash to support the answer. **You may not Edit, Write, or run state-changing commands** — this is a sidebar.

2. **Keep it brief.** Aside answers are typically 1–6 sentences. If the question genuinely needs a long answer, say so and offer to switch the active task to it.

3. **Distinguish question from direction.** Watch for cues that this isn't a side question but a real redirect:
   - User says "actually, let's…" / "instead of…" / "switch to…" → that's a direction change. Acknowledge, surface the trade-off ("the current task is X with Y left to go — drop it, or pause and resume?"), and wait.
   - User says "what does…" / "why did…" / "remind me…" / "is there…" → that's a question. Answer and resume.
   - Ambiguous → ask one disambiguating question and stop.

4. **End by surfacing the bookmark.** One line at the end: "**Back to:** `<one-line summary of the in-flight task and the next step>`." This anchors the resume.

5. **If the aside revealed something that should change the active task** (a contradicting fact, a missing requirement, a wrong assumption), name it explicitly. Don't silently re-plan.

## What not to do

- Don't edit files, run migrations, install packages, or invoke any other slash command from inside an aside.
- Don't pretend the aside didn't happen. The bookmark line at the end is required.
- Don't open scope. If the answer points to a fix worth doing, say "this is a fix worth a story" and stop — don't start it.
