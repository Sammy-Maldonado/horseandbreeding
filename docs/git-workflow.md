# Git Workflow — Horse & Breeder

**Status:** Authoritative
**Scope:** Branching, promotion, Pull Requests, merges, branch cleanup, hotfixes
**Related:** [CLAUDE.md](../CLAUDE.md) · [docs/adr/](adr/)

---

## 1. Purpose

This document is the **authoritative source** for how change reaches the stable branch in
this repository. It applies to humans and agents equally.

`CLAUDE.md` summarises these rules and points here. Where the two differ, **this document
wins** on Git mechanics.

Read this file before creating a branch, a commit, a push, a Pull Request, a merge, or
deleting a branch.

Linear issue IDs use the `HOR-X` format.

---

## 2. Permanent Branches

Three branches are permanent. They are never deleted, never receive direct commits, and
never receive a force push.

### `DEV`

**Responsibility: development integration.**

- Receives Pull Requests from issue branches.
- Where independent pieces of work first meet each other.
- Never receives direct commits.
- Never deleted.

### `QA`

**Responsibility: functional and technical validation.**

- Receives Pull Requests from `DEV`.
- Where a change is exercised as a candidate release rather than as an isolated diff.
- Never receives direct commits.
- Never deleted.

### `main`

**Responsibility: stable, releasable version.**

- Receives Pull Requests from `QA` only.
- Must remain buildable and testable at every commit.
- Never receives direct commits.
- Never deleted.

### Rules binding on all three

```txt
Permanent. Never deleted locally. Never deleted remotely.
No direct commits. No force push. No rewritten history.
Every change enters through a Pull Request.
No stage may be skipped.
```

---

## 3. Issue Branches

Every Linear issue gets its own branch. One issue, one branch.

**Issue branches are created from `DEV`**, not from `main`. The single exception is a
hotfix — see section 8.

### Naming

```txt
<prefix>/HOR-X-short-description
```

The issue ID is mandatory. A branch without `HOR-X` is not traceable and is not
acceptable.

### Allowed prefixes

```txt
feature/
fix/
hotfix/
refactor/
docs/
test/
chore/
```

### Choosing a prefix

| Prefix | Use for |
|---|---|
| `feature/` | New functionality |
| `fix/` | Correcting a non-critical defect |
| `hotfix/` | Urgent correction against production or `main` |
| `refactor/` | Internal change that does not alter functional behaviour |
| `docs/` | Documentation |
| `test/` | Tests |
| `chore/` | Maintenance, configuration, tooling |

Pick by **intent**, not by which files happen to change. Work that alters behaviour is
never a `refactor/`, even if the diff is small.

### Examples

```txt
feature/HOR-40-auction-excel-import
fix/HOR-41-pedigree-null-dam
hotfix/HOR-42-authentication-outage
refactor/HOR-43-report-assembler
docs/HOR-44-api-documentation
test/HOR-45-identity-resolution-cases
chore/HOR-46-upgrade-tooling
```

### Creating one

```bash
git switch DEV
git pull --ff-only
git switch -c <prefix>/HOR-X-description
```

Move the Linear issue to `In Progress` **before** the first file is modified.

---

## 4. The Promotion Flow

```txt
issue branch
  → Pull Request into DEV
    → Pull Request DEV into QA
      → Pull Request QA into main
```

At every stage:

- tests must pass;
- the build must pass where relevant;
- the Pull Request must be reviewable — a description that explains the change;
- direct pushes to the destination branch are not permitted;
- `DEV` may not be skipped;
- `QA` may not be skipped;
- if a validation fails, the change is **not promoted**.

There is no path from an issue branch to `main`. There is no path from `DEV` to `main`.

### Why the stages exist

`DEV` answers *"does this work alongside everything else that landed recently?"*

`QA` answers *"does this behave correctly as a release candidate?"*

`main` answers *"is this what we are prepared to run?"*

Skipping a stage does not save time. It moves the discovery of a defect to a place where
it is more expensive to fix.

---

## 5. Commits

Every commit message includes the issue ID.

```txt
test: reproduce storehorse status drift (HOR-35)
fix: route storehorse status filters through a compatibility layer (HOR-35)
refactor: extract horse search projection (HOR-35)
docs: record storehorse column drift and compatibility decision (HOR-35)
```

Rules:

- Conventional commits.
- One issue per commit series.
- Keep commits focused and reversible.
- **Never mention AI, Claude, Codex, prompts, or model names.**
- Never commit secrets, private documents, dumps, generated output, or unrelated
  formatting.
- TDD phase commits are encouraged: RED test, GREEN implementation, REFACTOR/QUALITY.

---

## 6. Required Checks

Before opening or merging any Pull Request:

```bash
pnpm test
pnpm build
```

Run issue-specific functional checks and Python tests where applicable.

`lint` and `typecheck` scripts are **not currently configured**. Do not claim they ran.

**Do not merge when a required check fails.**

If no automated check is configured for a stage, say so explicitly in the Pull Request.
"No checks reported" and "checks passed" are not the same statement, and recording them
as if they were is how an unverified change reaches `main`.

---

## 7. Pull Requests

Nothing reaches `DEV`, `QA` or `main` without one.

### Title

```txt
HOR-X — Short description
```

Promotion Pull Requests name the stage:

```txt
HOR-X — Promote <subject> to QA
HOR-X — Promote <subject> to main
```

### Required contents

Every Pull Request must include:

```md
## Linear

- Issue: HOR-X

## Summary

-

## Scope

-

## Out of scope

-

## Files changed

-

## Commands executed

-

## Tests

-

## Build

-

## Risks

-

## Pending decisions

-
```

An empty Pull Request body is a defect in the process, not a shortcut. The description is
what makes review possible; without it the review stage exists only on paper.

### Merge strategy

| Pull Request | Strategy |
|---|---|
| issue branch → `DEV` | Merge commit or squash — either is acceptable |
| `DEV` → `QA` | **Merge commit** |
| `QA` → `main` | **Merge commit** |

Promotion Pull Requests **must** use a merge commit. Squashing a promotion rewrites the
commits into a new object that does not exist on the source branch, so `DEV`, `QA` and
`main` immediately diverge and every later promotion reports phantom differences.

Never use force merge. Never bypass a configured check.

---

## 8. Hotfixes

An urgent production fix does not bypass traceability. It takes a different route, not a
shorter one.

**Do not execute this flow casually.** A hotfix is for an outage or a defect that cannot
wait for the normal promotion path.

### The flow

```txt
Linear issue (HOR-X)
  → hotfix/HOR-X-description branched from main
    → tests
      → Pull Request into main, reviewed
        → Pull Request main into QA
          → Pull Request QA into DEV
```

```bash
git switch main
git pull --ff-only
git switch -c hotfix/HOR-X-description
```

### Why it branches from `main`

`DEV` may contain unreleased work. Branching a hotfix from `DEV` would drag that unshipped
work into production alongside the fix. Branching from `main` keeps the fix minimal and
reviewable.

### Back-propagation is mandatory

After the fix lands in `main` it exists **only** in `main`. `QA` and `DEV` are now behind,
and the next promotion would silently revert the fix.

Back-propagate immediately, by Pull Request, in this order:

1. `main` → `QA`
2. `QA` → `DEV`

A hotfix is not finished when `main` is fixed. It is finished when all three permanent
branches contain it.

### Never

```txt
Never leave a hotfix only in main.
Never use git reset --hard to realign a branch after a hotfix.
Never force push a permanent branch.
Never delete DEV, QA or main.
```

---

## 9. Temporary Branch Cleanup

Once the change has reached `main`, the issue branch has served its purpose.

```bash
git switch main
git pull --ff-only
git branch -d <prefix>/HOR-X-description
git push origin --delete <prefix>/HOR-X-description
```

`git branch -d` is deliberate — it refuses to delete a branch that is not merged. Do not
reach for `-D` to force it. A refusal means the work is not where you think it is.

Keep the issue branch until the change has actually reached `main` if it is still needed
to open a promotion Pull Request.

Retain: `DEV`, `QA`, `main`.

### Never run

```bash
git branch -d DEV
git branch -d QA
git branch -d main
git push origin --delete DEV
git push origin --delete QA
git push origin --delete main
```

---

## 10. Keeping the Permanent Branches in Sync

After a release reaches `main`, the three branches must converge again.

- `main` is the stable version.
- `DEV` and `QA` are realigned through **Pull Requests or non-destructive merges** only.
- A fast-forward is acceptable when the target branch is a strict ancestor of the source:
  it introduces no new commit and rewrites nothing.

```bash
git merge-base --is-ancestor origin/DEV origin/main   # exit 0 → fast-forward is safe
```

### Never

```txt
Never use git reset --hard to align a permanent branch.
Never rewrite shared history.
Never force push to align branches.
```

If the branches have genuinely diverged and a fast-forward is not possible, resolve it
with a merge commit through a Pull Request. Divergence is information; deleting it with a
hard reset destroys the record of what happened.

---

## 11. GitHub Branch Protection — Recommended

`DEV`, `QA` and `main` should be protected on GitHub. The rules in this document are
conventions; protection makes them enforceable.

Recommended settings for all three:

```txt
Require a Pull Request before merging
Require status checks to pass
Block force pushes
Block deletions
Require a review before merging
```

**Do not change GitHub protection rules without separate authorisation.** This section is
a recommendation, not an instruction to apply it.

Note: no CI workflow exists in this repository yet, so "require status checks" has nothing
to require. Configuring CI is prerequisite work and belongs in its own Linear issue.

---

## 12. Worktrees and Agents

Each concurrent task or agent must use:

```txt
one Linear issue
one branch
one worktree/folder
```

Do not let two agents edit the same working tree.

```bash
git fetch origin
git switch DEV
git pull --ff-only
git worktree add ../hbnuxt-HOR-X -b <prefix>/HOR-X-description
```

---

## 13. Before Starting Work

```bash
git status --short
git branch --show-current
git log -5 --oneline
```

Then:

1. Read [CLAUDE.md](../CLAUDE.md).
2. Read this document.
3. Read the assigned Linear issue and its parent EPIC.
4. Move the issue to `In Progress`.
5. Create the issue branch from `DEV`.
6. State the implementation plan.

---

## 14. Forbidden Without Explicit Approval

```bash
git reset --hard
git clean -fd
git push --force
git push --force-with-lease
git rebase --onto
git filter-repo
```

Do not rewrite shared history.

---

## 15. Private Data Review

Before every commit:

```bash
git status --short
git diff --cached --name-only
```

Confirm none of these are staged:

```txt
.env
.env.save
data/private/
real Word/Excel catalogues
database dumps
generated PDFs containing client data
```

Never stage with a broad `git add .` without checking `git status` first.
