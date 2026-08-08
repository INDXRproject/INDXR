# Git hooks

Local git hooks (not auto-installed; `.git/hooks/` is not version-controlled).

## post-commit

Appends a one-line commit summary to **`docs/COMMITS.md`** — a **gitignored** local mirror of
`git log`. It does **not** touch `docs/LOG.md` and does **not** `--amend`.

### Why (2026-08-08)

This hook used to append to `docs/LOG.md` and fold the append into the commit via
`git commit --amend`. That had two problems:

1. It bloated `docs/LOG.md` with 700+ machine `commit:`/`Changed:` blocks nobody reads.
   `LOG.md` is for **hand-written session entries** (read at session start).
2. The whole-file `git add docs/LOG.md` swept a **concurrent session's** uncommitted `LOG.md`
   line into an unrelated commit on the amend (this happened — commit `bf9d222`).

Writing to a gitignored `docs/COMMITS.md` with **no amend** fixes both structurally:

- `LOG.md` stays purely hand-written; `git log` is the real history and `docs/COMMITS.md` is
  just a flat local convenience mirror.
- No `--amend` → commit SHAs are stable, and the concurrency-sweep bug is **gone**: the hook
  never runs `git add` and never amends, so it can never stage another session's work.
- The working tree stays clean because `docs/COMMITS.md` is gitignored (no recursion guard
  needed — without `--amend`, post-commit doesn't re-fire).

The historical 700+ blocks were removed from `LOG.md`, not migrated; `git log` retains them.

Install (once per clone):

```bash
cp scripts/git-hooks/post-commit .git/hooks/post-commit && chmod +x .git/hooks/post-commit
```
