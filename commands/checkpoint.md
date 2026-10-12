---
description: Create, list, or restore a named workflow checkpoint (git stash + log entry). Useful before risky work.
argument-hint: "<create|list|restore> <label>"
---

Checkpoint operation:

> $ARGUMENTS

## How to handle this

Parse `$ARGUMENTS` into an action and a label. Actions:

### `create <label>`

1. Verify there's something to checkpoint (`git status --porcelain`). If clean, ask the user whether they want to anchor on `HEAD` instead.
2. Pick the storage mechanism:
   - **Stash** (default for mid-work checkpoints with no commit): `git stash push -u -m "checkpoint:<label>"`.
   - **Commit** (when the user is on a feature branch and a real commit is desired): `git add -A && git commit -m "checkpoint: <label>"`.
   - Confirm with the user if it's not obvious.
3. Append a line to `.claude/checkpoints.log` (create if missing):
   `YYYY-MM-DDTHH:MM:SSZ  <label>  <stash@{N} or commit-sha>  <one-line description if user provided one>`
4. Report: storage type, identifier, how to restore.

### `list`

Read `.claude/checkpoints.log` and print as a table (date, label, identifier). If the log doesn't exist, say so.

### `restore <label>`

1. Look up `<label>` in `.claude/checkpoints.log`. Refuse if ambiguous (multiple matches); ask for the timestamp.
2. **Verify working tree is clean** or stash uncommitted work first (`git stash push -u -m "pre-restore-<label>"`).
3. Apply:
   - Stash: `git stash apply <stash@{N}>` (apply, don't pop — leave the checkpoint in place).
   - Commit: ask the user whether they want `git checkout <sha>` (detached) or `git reset --hard <sha>` (destructive — confirm).
4. Report what was applied and any conflicts.

## What not to do

- Don't pop stashes — apply only. Checkpoints should remain available.
- Don't `git reset --hard` without explicit confirmation; it's destructive.
- Don't write to `.claude/checkpoints.log` without recording enough to find the checkpoint later — label alone isn't enough; capture the stash ref or sha.
- Don't fall back to "I'll just remember" if the log write fails. Surface the failure.
