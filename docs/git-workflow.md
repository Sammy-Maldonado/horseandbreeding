# Git Workflow — Horse & Breeder

**Status:** Authoritative
**Scope:** Branching, promotion, Pull Requests, merges, branch protection, branch
cleanup, hotfixes, release automation
**Related:** [CLAUDE.md](../CLAUDE.md) · [docs/adr/](adr/)

---

## 1. Purpose

This document is the **authoritative source** for how change reaches the stable branch in
this repository. It applies to humans and agents equally.

`CLAUDE.md` summarises these rules and points here. Where the two differ, **this document
wins** on Git mechanics.

Read this file before creating or modifying:

```txt
a branch
a commit
a push
a Pull Request
a merge
a release workflow
a branch protection rule
a branch deletion
```

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
No direct commits. No direct pushes. No force push. No rewritten history.
No fast-forward push from one permanent branch to another.
Every change enters through a Pull Request.
No stage may be skipped.
```

### The three branches are not required to share a SHA

`DEV`, `QA` and `main` point at **different commits, and that is the expected state.**

Every promotion Pull Request produces its own merge commit on its own destination
branch. Three Pull Requests produce three distinct merge commits. Equal SHAs are neither
a goal nor a health indicator, and chasing them is how permanent branches get corrupted.

The valid state is defined by **content and ancestry**, not by hashes:

```txt
DEV  contains the changes integrated for development
QA   contains the changes promoted and validated from DEV
main contains the changes promoted and released from QA
```

Verify with ancestry, never with hash equality:

```bash
git merge-base --is-ancestor origin/QA origin/main    # exit 0 → QA is contained in main
```

Aligning permanent branches by any of the following is **strictly forbidden**:

```txt
direct push
fast-forward push
git push origin main:DEV
git push origin main:QA
direct ref updates through the GitHub API
git reset
git push --force
any update that does not travel through a Pull Request
```

`git pull --ff-only` is permitted for **one purpose only**: updating a local branch from
its own remote counterpart, for example `DEV` from `origin/DEV`. It is never a promotion
mechanism between permanent branches.

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

## 5. Commits and Conventional Prefixes

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

### Accepted prefixes

```txt
feat:       a new capability
fix:        a defect correction
perf:       a performance change with no behavioural change
refactor:   an internal change with no behavioural change
docs:       documentation
test:       tests
build:      build system, packaging, dependencies
ci:         continuous integration and workflows
chore:      maintenance, configuration, tooling
revert:     reverting a previous commit
```

### Why the prefix matters beyond readability

Release Please reads the commits that reach `main` and derives the version bump, the
`CHANGELOG.md` entries and the release notes **from these prefixes alone.** A commit
labelled `chore:` when it is really a `feat:` does not just read badly — it silently
produces the wrong version number. See section 12.

Prefix impact on the version:

| Prefix | Version effect |
|---|---|
| `feat:` | minor bump |
| `fix:`, `perf:` | patch bump |
| `revert:` | patch bump |
| `docs:`, `test:`, `build:`, `ci:`, `chore:`, `refactor:` | no release on their own |

### Breaking changes

A breaking change is declared in one of two ways, and **must** be declared in one of
them:

```txt
feat!: replace the storehorse status contract (HOR-X)
```

or with a footer:

```txt
feat: replace the storehorse status contract (HOR-X)

BREAKING CHANGE: storehorse.status no longer accepts the legacy numeric codes.
```

Either form triggers a major bump. An undeclared breaking change ships as a minor or
patch release, which is a lie told to every consumer of the version number.

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

### The authoritative check

```txt
Workflow:  CI            (.github/workflows/ci.yml)
Check:     Test / Build
```

`Test / Build` is **the** authoritative required check for every Pull Request into
`DEV`, `QA` and `main`.

A green `pnpm test` and `pnpm build` on a local machine is useful evidence, but it is
**not** a substitute for the real check. Local runs use a local `node_modules`, a local
Node version and a local environment; the GitHub run uses `pnpm install --frozen-lockfile`
on a clean machine. They can and do disagree.

If no check has reported on a Pull Request, say exactly that. **"No checks reported"
must never be described, recorded or summarised as a passing check.** Doing so is the
single fastest route to an unverified change reaching `main`.

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
| issue branch → `DEV` | **Merge commit** |
| `DEV` → `QA` | **Merge commit** |
| `QA` → `main` | **Merge commit** |
| `main` → `QA` (hotfix back-propagation) | **Merge commit** |
| `QA` → `DEV` (hotfix back-propagation) | **Merge commit** |
| Release Pull Request → `main` | **Merge commit** |

**Every Pull Request in this repository merges with a merge commit.** No exceptions.

```txt
Squash merge:   forbidden
Rebase merge:   forbidden
Direct fast-forward promotion: forbidden
```

Squashing or rebasing a promotion rewrites the commits into new objects that do not
exist on the source branch, so `DEV`, `QA` and `main` diverge on identity rather than on
content, and every later promotion reports phantom differences that no one can resolve
without rewriting history. A merge commit preserves ancestry, preserves the original
conventional commits Release Please depends on, and keeps every later promotion honest.

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

## 10. Synchronising the Permanent Branches

**Synchronisation between permanent branches happens exclusively through Pull Requests.**
There is no second mechanism. There is no shortcut for a small difference.

Content flows in one direction for normal work and the opposite direction for a hotfix,
and in both cases every hop is a Pull Request:

```txt
normal:  issue branch → DEV → QA → main
hotfix:  hotfix branch → main → QA → DEV
```

### What "in sync" means

It means each branch **contains** the changes it is supposed to contain — verified by
ancestry, as described in section 2. It does **not** mean the branches point at the same
commit, and they normally do not.

```bash
git merge-base --is-ancestor origin/DEV origin/QA     # exit 0 → DEV is contained in QA
git merge-base --is-ancestor origin/QA  origin/main   # exit 0 → QA is contained in main
```

### Never

```txt
Never align a permanent branch with a direct push.
Never align a permanent branch with a fast-forward push.
Never align a permanent branch with git reset.
Never force push to align branches.
Never rewrite shared history.
Never create an empty or artificial commit whose only purpose is to make two SHAs equal.
```

An empty "sync commit" fabricates a history event that never happened, to satisfy a
metric — SHA equality — that this document explicitly rejects. If two branches have
genuinely diverged, resolve it with a merge commit through a Pull Request. Divergence is
information; erasing it destroys the record of what happened.

---

## 11. GitHub Branch Protection

`DEV`, `QA` and `main` must be protected on GitHub. The rules in this document are
conventions; protection is what makes them enforceable rather than merely honoured.

### Required configuration for all three branches

| Setting | Value |
|---|---|
| Require a Pull Request before merging | enabled |
| Required approving reviews | `0` — solo maintainer; an impossible approval must not block delivery |
| Require conversation resolution before merging | enabled |
| Required status check | `Test / Build` |
| Require branches to be up to date before merging | enabled |
| Block force pushes | enabled |
| Block branch deletion | enabled |
| Block non-fast-forward updates | enabled |
| Block direct pushes | enabled |
| Bypass actors | **none** |

### No bypass

There is **no** admin bypass, no personal bypass for the maintainer, no bypass to skip
`Test / Build`, and **no bypass for Release Please.** The release automation opens a
Pull Request and passes CI like every other change. An automation exempted from the rule
it exists to serve is not automation; it is an unaudited write path to `main`.

### Current status — not yet enforced

At the time of writing, protection is **documented but not technically applied.**

The repository is **private** on a **GitHub Free** plan. Both the rulesets API and the
classic branch-protection API refuse the configuration with the same response:

```txt
403 — Upgrade to GitHub Pro or make this repository public to enable this feature.
```

Endpoints that returned it:

```txt
GET /repos/{owner}/{repo}/rulesets
GET /repos/{owner}/{repo}/branches/DEV/protection
GET /repos/{owner}/{repo}/branches/QA/protection
GET /repos/{owner}/{repo}/branches/main/protection
```

Until the plan changes, the rules above remain **conventions enforced by discipline.**
Recording them as enforced would be false. When the plan allows it, apply the table above
and replace this subsection with the applied configuration and its evidence.

**Do not change GitHub protection rules without an authorising Linear issue.**

---

## 12. Release Please

Release automation is `.github/workflows/release-please.yml`. It runs on `main`.

### What it does

1. Reads the conventional commits that have reached `main`.
2. Derives the next version from the prefixes documented in section 5.
3. Opens — or updates — a **release Pull Request** targeting `main`, containing the
   version bump and the generated `CHANGELOG.md`.
4. When that Pull Request is **merged by a human**, it creates the corresponding Git tag
   and GitHub Release according to the configured strategy.

### Binding rules

```txt
The release Pull Request targets main.
The release Pull Request must pass Test / Build like any other Pull Request.
The release Pull Request is reviewed and merged manually.
Release Please must not bypass CI.
Release Please must not bypass branch protection.
Release Please must not auto-merge anything.
```

**Do not merge a generated release Pull Request without explicit authorisation from
Sammy.** Merging it publishes a version and a tag; that is a product decision, not a
maintenance step.

### Why it needs a token rather than `GITHUB_TOKEN`

GitHub does not start a new workflow run for events created with the default
`GITHUB_TOKEN`. A release Pull Request opened with it would therefore never trigger the
CI workflow, and `Test / Build` would never report — producing exactly the "no checks
reported" state section 6 forbids treating as a pass.

The workflow therefore uses a repository secret holding a fine-grained token. **The
correct response to a release Pull Request that does not trigger CI is to fix the token
— never to remove the required check, add a bypass, or change the CI trigger.**

Never read, print, echo, log or commit the value of that secret.

---

## 13. Linear Evidence

Linear is the source of truth for work status. A status is not evidence of correctness.

**Automatic movement of an issue to `Done` — by a Git integration, a merged Pull Request
or a branch name — does not prove a single acceptance criterion.** It proves that a
branch was merged. Nothing more.

If an integration closes an issue before evidence has been recorded:

1. Verify **every** acceptance criterion individually against reality.
2. If any criterion is incomplete, **reopen the issue** or return it to `In Progress`.
3. Record the final evidence — commands run, real check results, URLs — on the issue.
4. Only then treat it as honestly complete.

A falsely closed issue is worse than an open one: an open issue is visible work, while a
falsely closed one is an unverified claim that nobody will revisit.

---

## 14. Worktrees and Agents

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

## 15. Before Starting Work

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

## 16. Forbidden Without Explicit Approval

```bash
git reset --hard
git clean -fd
git push --force
git push --force-with-lease
git rebase --onto
git filter-repo
```

Forbidden outright, with or without approval, against `DEV`, `QA` or `main`:

```bash
git push origin <local>:DEV          # direct push to a permanent branch
git push origin main:QA              # fast-forward promotion, bypasses review
git push origin main:DEV             # same
git branch -d DEV                    # deleting a permanent branch
git push origin --delete QA          # same, remotely
```

Do not rewrite shared history.

---

## 17. Private Data Review

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
