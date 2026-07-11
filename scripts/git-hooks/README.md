# Git hooks

Local git hooks (not auto-installed; `.git/hooks/` is not version-controlled).

## post-commit

Appends a one-line commit summary to `docs/LOG.md` and **folds it into the just-made
commit** (`git commit --amend`) so the working tree stays clean.

Fixes the old loop: the previous version appended to `docs/LOG.md` *without* committing,
leaving a permanent `M docs/LOG.md` that re-triggered every commit. A recursion guard
(`INDXR_LOG_HOOK`) makes the amend's re-fired hook a no-op, so exactly one amend runs.

Install (once per clone):

```bash
cp scripts/git-hooks/post-commit .git/hooks/post-commit && chmod +x .git/hooks/post-commit
```

Note: because the hook amends, the commit SHA is finalized *after* the hook runs — read it
with `git log -1` (post-hook), not from `git commit`'s own stdout.
