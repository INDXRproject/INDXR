# Git hooks

Local git hooks (not auto-installed; `.git/hooks/` is not version-controlled).

## post-commit

Appends a one-line commit summary to `docs/LOG.md` and **folds it into the just-made
commit** (`git commit --amend`) so the working tree stays clean.

**Concurrency safety (2026-08-08):** before amending, the hook checks whether `docs/LOG.md`
has any change that is *not* part of the commit that just landed (`git diff HEAD` + `--cached`).
- **Clean** → only our appended line is new → `git add docs/LOG.md` + `--amend`.
- **Dirty** (a concurrent session has an uncommitted LOG.md line) → **do not amend**; the line
  is still written but left uncommitted for the next commit to pick up. Another session's work
  is never staged or amended. This fixes the bug where a bare `git add docs/LOG.md` swept a
  summary-round log line into an unrelated commit (`bf9d222`).

The hook prints which branch it took. A recursion guard (`INDXR_LOG_HOOK`) makes the amend's
re-fired hook a no-op, so exactly one amend runs.

Install (once per clone):

```bash
cp scripts/git-hooks/post-commit .git/hooks/post-commit && chmod +x .git/hooks/post-commit
```

Note: because the hook amends, the commit SHA is finalized *after* the hook runs — read it
with `git log -1` (post-hook), not from `git commit`'s own stdout.
