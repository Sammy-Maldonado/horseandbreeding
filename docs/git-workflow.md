# Git Workflow — Horse & Breeder

## 1. Purpose

Provide a safe, traceable workflow for human and agentic development.

Linear issue IDs use the `HOR-X` format.

---

## 2. Branches

### Stable branch

```txt
main
```

`main` must remain buildable and testable.

Do not commit directly to `main`.

### Task branches

Create one branch per Linear issue from the latest `main`.

Examples:

```txt
feat/HOR-12-extractor-productionised
fix/HOR-35-storehorse-status-compatibility
test/HOR-14-identity-resolution-cases
docs/HOR-33-prisma-preservation-rule
refactor/HOR-7-prisma-schema-rfc
chore/HOR-34-private-source-documents
```

Allowed prefixes:

```txt
feat/
fix/
test/
docs/
refactor/
chore/
```

---

## 3. Worktrees and Agents

Each concurrent task or agent must use:

```txt
one Linear issue
one branch
one worktree/folder
```

Do not let two agents edit the same working tree.

Example:

```bash
git fetch origin
git switch main
git pull --ff-only
git worktree add ../hbnuxt-HOR-35 -b fix/HOR-35-storehorse-status-compatibility
```

---

## 4. Before Work

```bash
git status --short
git branch --show-current
git log -5 --oneline
```

Then:

1. Read `CLAUDE.md`.
2. Read the assigned Linear issue and parent EPIC.
3. Move the issue to `In Progress`.
4. Create/switch to the issue branch.
5. State the implementation plan.

---

## 5. Commits

Every commit includes the issue ID.

Examples:

```txt
test: reproduce storehorse status drift (HOR-35)
fix: select compatible horse fields for local search (HOR-35)
refactor: extract horse search projection (HOR-35)
docs: record compatibility decision (HOR-35)
```

Rules:

- One issue per commit series.
- Keep commits focused and reversible.
- Never mention AI, Claude, Codex, prompts, or model names.
- Do not commit secrets, private documents, dumps, generated output, or unrelated formatting.
- TDD phase commits are encouraged when useful: RED test, GREEN implementation, REFACTOR/QUALITY.

---

## 6. Required Checks

Before opening or merging a PR:

```bash
pnpm test
pnpm build
```

Also run when relevant:

```bash
pnpm lint
pnpm typecheck
```

Run issue-specific functional checks and Python tests where applicable.

Do not merge when required checks fail.

---

## 7. Pull Requests

Open a PR when the work is shared, reviewed, or merged into `main`. Solo local work on a
task branch may defer the PR until the issue is ready for review, but nothing reaches
`main` without one.

PR title:

```txt
HOR-35 — Resolve local hbold compatibility with storehorse.status
```

PR description:

```md
## Linear

- Issue: HOR-35

## Summary

-

## Scope

-

## Out of scope

-

## Verification

- [ ] pnpm test
- [ ] pnpm build
- [ ] issue-specific acceptance checks
- [ ] no private files or secrets
- [ ] schema/data safety reviewed

## Files changed

-

## Risks / follow-up

-
```

The PR must link the Linear issue.

---

## 8. Merge

Preferred merge strategy:

```txt
Squash merge
```

Use a final message containing the issue ID.

After merge:

```bash
git switch main
git pull --ff-only
git branch -d <task-branch>
git worktree remove <task-worktree>
```

Update Linear with the final commit/PR and move the issue to `Done` only after acceptance checks pass.

---

## 9. Hotfixes

A production hotfix still requires:

```txt
Linear issue
→ fix branch
→ tests
→ review
→ merge
```

Do not bypass traceability because a fix is urgent.

---

## 10. Forbidden Commands Without Explicit Approval

```bash
git reset --hard
git clean -fd
git push --force
git rebase --onto
git filter-repo
```

Do not rewrite shared history.

---

## 11. Private Data Review

Before every commit:

```bash
git status --short
git diff --cached --name-only
```

Confirm that none of these are staged:

```txt
.env
.env.save
data/private/
real Word/Excel catalogues
database dumps
generated PDFs containing client data
```
