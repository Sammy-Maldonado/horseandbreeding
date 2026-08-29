# CLAUDE.md — Horse & Breeder Agent Contract

## 1. Purpose

This file is the **authoritative execution contract** for coding agents in this
repository. It defines how work is authorised, bounded, executed, verified, recorded and
synchronised — the full task lifecycle, from the first source consulted to the moment an
issue may be closed.

It states rules. It does not restate the documents it points to — detail lives in the
specialised documents listed in section 3. It holds **no current work status** and it is
**not a historical log**.

---

## 2. Agent Role

Act as a Senior Software Architect, Senior Full-Stack Engineer, and Data Migration
Engineer.

- Follow the sources of truth.
- Respect the adopted architecture and domain invariants.
- Implement incrementally — only the assigned Linear issue.
- Treat Sammy as the final decision-maker.
- Ask before changing architecture, data contracts, scope, or product behaviour.
- Prefer preserving verified working behaviour over rewriting it.

Do not redefine product scope. Do not invent requirements. Do not silently repair
unrelated problems.

**Language:** Sammy communicates in Spanish. Code, comments, documentation, and commit
messages are written in English. UI copy intended for Marcus is plain English with zero
jargon.

---

## 3. Sources of Truth

| Document | Owns |
|---|---|
| `CLAUDE.md` | The agent execution contract: how work starts, executes, finishes and synchronises; binding agent rules, invariants, prohibited actions |
| [docs/requirements/automation-mvp.md](docs/requirements/automation-mvp.md) | Stable functional requirements, business rules, acceptance scenarios |
| [docs/adr/](docs/adr/) | Accepted architecture decisions — binding until superseded |
| [docs/architecture/existing-assets.md](docs/architecture/existing-assets.md) | Reusable technical inventory |
| [docs/data/hbold-baseline.md](docs/data/hbold-baseline.md) | Reference database baseline and schema drift |
| [docs/domain/writeup-grammar.md](docs/domain/writeup-grammar.md) | Historical Word write-up grammar |
| [docs/git-workflow.md](docs/git-workflow.md) | Branching, commits, PRs, private-data review |
| [docs/runbooks/local-development.md](docs/runbooks/local-development.md) | Local setup, database, extractor, troubleshooting |
| [docs/testing/testing-strategy.md](docs/testing/testing-strategy.md) | Authoritative testing policy: test categories, TDD, fixtures, data safety, local/CI gates, modernisation regression gates |
| [docs/modernisation/modernisation-plan.md](docs/modernisation/modernisation-plan.md) | Modernisation *progress*: which stages exist, which are complete, which is next — **read before any dependency modernisation** |
| Linear | Work items **and the detailed execution record**: status, ownership, priority, dependencies, acceptance criteria, files changed, commands, test and build results, Pull Requests, CI runs, decisions taken during the issue, blockers, and the durable documents the issue changed |
| Engram memory | Concise cross-session operational context: recent decisions, discoveries, status corrections, where development stopped — **advisory**, never authoritative over the sources above |
| Git and `main` | What was actually implemented and promoted — repository reality, verified during the final synchronisation check |

Each source has one responsibility and does not take over another's. `CLAUDE.md` states
rules. Linear records what happened. The specialised documents above hold **durable
knowledge** that must remain understandable independently of any session. Engram carries
context between sessions. Git records what was actually built. Current work status is
never copied into this file, and Linear's detailed execution record is never copied into
the durable documents.

### Task start lifecycle

Before any project file is modified, consult these sources **in this order**, then
reconcile them:

1. **`CLAUDE.md` — first.** The execution contract: rules, source ownership, precedence,
   prohibited actions, and which specialised documents this task requires. Read the
   contract before anything else claims to be the truth.
2. **Engram.** `mem_search` the area about to be touched: recent cross-session context,
   the last completed work, recent decisions and corrections, known blockers, where
   development stopped. Memory reflects what was true when written — verify that anything
   it names still exists. **Engram provides context, not authority.**
3. **Linear.** The assigned issue, its parent EPIC, status, dependencies, acceptance
   criteria, and the evidence already recorded on related issues.
4. **The relevant specialised authoritative documents** — only those this task touches,
   routed by the table above: ADRs, requirements, testing strategy, modernisation plan,
   Git workflow, domain documentation, runbooks.
5. **Repository reality.** Branch, working tree, the code, tests and configuration
   actually present.
6. **Reconcile.** Compare `CLAUDE.md` ↔ Engram ↔ Linear ↔ the relevant authoritative
   documents ↔ repository reality. **Do not begin implementation while a material
   contradiction remains unresolved.**
7. **Resolve conflicts by Precedence, never by timestamp** — see below.

Only once the sources are coordinated does the task itself start: move the Linear issue to
`In Progress`, create or switch to the issue branch, state the plan, and only then modify
files. The full cycle is §11.

### Precedence

1. Explicit current instruction from Sammy.
2. Accepted ADRs.
3. Stable functional requirements.
4. Assigned Linear issue and acceptance criteria.
5. Existing verified tests.
6. Existing implementation.
7. Historical or legacy code.

### Conflict policy

If two sources conflict, if required information is missing, or if a decision would
expand scope: **stop, state the conflict explicitly, and ask for a decision.**

Do not proceed by assumption. Do not pick a side silently. Do not resolve a conflict by
editing one of the conflicting sources without approval.

**Being newer is not authority.** A conflict is resolved by the Precedence order above and
by which source owns the fact — never by which was written last:

- **Engram does not outrank an ADR, a requirement or Linear because it is more recent.** A
  stale memory is corrected once an authoritative source proves it stale.
- **Linear may need a dated status-correction** when its current description no longer
  represents an explicitly approved decision.
- **Durable documentation is updated only when the underlying knowledge actually
  changed** — never to make a contradiction disappear.
- **Never silently rewrite an authoritative source to eliminate a conflict.**

If Precedence does not resolve it: **stop, explain the conflict, ask Sammy.**

### Automation MVP reconciliation rule

Before implementing any Automation MVP issue:

1. Read the issue's current acceptance criteria in Linear.
2. Read the relevant stable requirements —
   [automation-mvp.md](docs/requirements/automation-mvp.md), including its
   **Architecture invariants** — and the relevant accepted ADRs, in particular
   [ADR-005](docs/adr/ADR-005-canonical-writeup-library.md),
   [ADR-017](docs/adr/ADR-017-separate-catalogue-ingestion-from-report-serving.md) and
   [ADR-018](docs/adr/ADR-018-storehorse-canonical-registry-and-word-authoritative-ingestion.md).
3. Compare them semantically. An old Linear issue does not override a newer approved
   requirement or accepted ADR.
4. On conflict, **stop implementation and reconcile the issue first.** Never implement
   stale acceptance criteria merely because they already exist in Linear.

Current work status belongs in Linear and is never copied into this file.

---

## 4. Scope Boundaries

The product automates pedigree-catalogue production for sport-horse auctions:

```txt
Word catalogue ingestion
→ structured maternal-line data
→ canonical write-up library
→ horse identity resolution
→ pedigree + write-up assembly
→ professional PDF
→ batch generation from auction Excel
→ human review only for unresolved cases
```

Authoritative scope and exclusions live in
[automation-mvp.md](docs/requirements/automation-mvp.md). **Do not expand scope from
memory.**

Out of scope unless a dedicated approved issue says otherwise: a rewrite from scratch,
construction-company systems, external scraping or enrichment, billing redesign,
marketplace features, unapproved schema deletion, unapproved production data migration,
a second frontend framework, and new ORMs or database engines.

---

## 5. Critical Invariants

Binding. Violating one is a defect regardless of what the issue asked for.

### Architecture

- **Adopt and modernise the existing Nuxt application. Never rewrite from scratch**
  ([ADR-001](docs/adr/ADR-001-adopt-existing-nuxt-application.md)).
- Keep server-side business logic in Nitro under `server/`.
- Keep the **Python extractor as a separate module** under `extractor/`, isolated from
  the Node toolchain and its dependency tree.
- Treat `_legacy/` as **read-only reference. Never import it at runtime.**
- Audit verified components and endpoints before reuse; do not rebuild blindly
  ([existing-assets.md](docs/architecture/existing-assets.md)).
- Feature-specific code stays local to the feature; code used by two or more features may
  become shared. Structure screams functionality, not technical grouping.
- Containers own state and orchestration; presentational components receive data and
  emit events.

### Domain

- **`storehorse.dam_id` and `storehorse.sire_id` are the verified pedigree relations**
  and define the pedigree chain.
- **The maternal line is traversed through `dam_id`.**
- **`mareline_id` groups maternal families. It does not replace the pedigree chain.**
- **`storehorse` is the single canonical horse registry**, keyed by `horse_id`. There is
  no second canonical horse table. The current `hbold` snapshot may be stale: it is a
  reconciliation target, never an authority over the Word source
  ([ADR-018](docs/adr/ADR-018-storehorse-canonical-registry-and-word-authoritative-ingestion.md)).
- **Marcus's completed Word catalogues are the authoritative ingestion source for the
  business content they contain** — write-ups, pedigree as printed, competition results,
  approvals, riders and related facts — not the database text fields
  ([ADR-018](docs/adr/ADR-018-storehorse-canonical-registry-and-word-authoritative-ingestion.md)).
  A stale or missing database row never justifies discarding Word content.
- **Historical Word catalogues are ingestion sources, never runtime dependencies for
  report serving**
  ([ADR-017](docs/adr/ADR-017-separate-catalogue-ingestion-from-report-serving.md)).
  No report request re-parses the historical corpus.
- **Identity resolution never creates a horse blindly.** Every extracted horse is
  `EXISTING_HORSE` (reuse `horse_id`), `NEW_HORSE` (created only through the safe
  source-derived contract of ADR-018), `AMBIGUOUS` (review; never inserted, merged or
  assigned) or `CONFLICT` (every assertion preserved; review). Name alone is never a
  match.
- **No silent data loss through ingestion.** Every extracted item is accounted for through
  canonicalisation and persistence; source assertions and provenance survive canonical
  updates; Word-versus-database and Word-versus-Word conflicts are audited, never
  discarded ([ADR-018](docs/adr/ADR-018-storehorse-canonical-registry-and-word-authoritative-ingestion.md)).
- **A mare has at most one canonical write-up**, keyed to her `horse_id` and reused
  across every foal in her line
  ([ADR-005](docs/adr/ADR-005-canonical-writeup-library.md)).
- `(SEE ABOVE)` is a reuse reference, not new content.
- **Human review is a first-class workflow.** Ambiguous identity matches are never
  auto-assigned. Conflicting write-ups are never overwritten silently.
- Missing horses may remain text-only descendants when absent from `storehorse`.
- Batch ingestion must be resumable and idempotent.
- Excel rows must never be silently dropped.
- Source provenance must be retained for imported content.

Full domain detail: [automation-mvp.md](docs/requirements/automation-mvp.md) and
[writeup-grammar.md](docs/domain/writeup-grammar.md).

---

## 6. Prisma and Data Safety

Governed by [ADR-003](docs/adr/ADR-003-prisma-schema-preservation.md). Measured drift:
[hbold-baseline.md](docs/data/hbold-baseline.md).

- **Do not delete Prisma models or fields only because they are absent from `hbold`.**
  `hbold` is an older reference database; absence is evidence of drift, not obsolescence.
- **Never run `prisma db pull` against the versioned schema.** It rewrites the file in
  place and silently drops code-only models.
- Use `pnpm exec prisma db pull --print`, or point `--schema` at a throwaway file
  containing only `generator` and `datasource` blocks.
- Any schema removal requires confirmed evidence, a dedicated Linear issue, explicit
  acceptance criteria, tests, and an approved migration and rollback plan.
- Do not modify production data without explicit approval.
- Do not add compatibility columns as an ad-hoc fix.
- Do not reset a database or run destructive Prisma commands.
- Verify backups before destructive or irreversible operations.
- Local compatibility fixes must be minimal, reversible, tested, and documented.

---

## 7. Security and Privacy

- Authentication must be enforced on protected endpoints.
- Validate request bodies, params, query strings, and uploads. **Never trust Excel or
  Word input.**
- Never hardcode credentials. Never log credentials, tokens, database URLs, private
  document contents, or secrets.
- Never return internal stack traces or expose internal errors to the client.
- Do not hide database errors with generic `try/catch` blocks or empty responses.
  Missing, ambiguous, and conflicting data must be explicit.
- Never commit `.env`, `.env.save`, database dumps, or real source documents. Keep
  `.env.example` versioned with names and safe placeholders only, and update it whenever
  a variable is added or changed.
- **Real client documents live under `data/private/` and are ignored by Git.** Never
  place them in `public/`, `assets/`, `extractor/`, or `_legacy/`, and never quote their
  contents in documentation.
- Do not stage private files with broad commands such as `git add .` without checking
  `git status` first.

Expected status codes: `400`, `401`, `403`, `404`, `409`, `422`, `500`.

---

## 8. Testing — TDD Red-Green-Refactor

**The authoritative testing policy lives in
[docs/testing/testing-strategy.md](docs/testing/testing-strategy.md).** That document owns
the detail — test categories, file placement, fixtures, data safety, local and CI gates,
and the dependency-modernisation regression gates. This section states the rules that bind
and points there. It is not duplicated — where the two differ, the testing strategy wins on
testing policy.

**Read [docs/testing/testing-strategy.md](docs/testing/testing-strategy.md) before
modifying:**

```txt
application behaviour or the storehorse compatibility logic
tests, test fixtures, or test placement
Vitest configuration or the Node/Nuxt project split
test dependencies (@nuxt/test-utils, @vue/test-utils, happy-dom, vitest)
framework or dependency versions (Node, Nuxt, Vue, Prisma, Vite, Vitest)
```

Binding summary:

- Use **RED → GREEN → REFACTOR** for new behaviour in the mandatory areas below.
- Keep pure, framework-free tests in the **Node** project (`*.test.ts`).
- Use the **Nuxt** project (`*.nuxt.test.ts`) only when a test genuinely needs a Nuxt
  runtime; the `*.nuxt.test.ts` suffix is the single switch that routes a file to one
  project.
- Test files live **beside the code they protect**.
- Component and unit tests must **not connect to `hbold`** or any real database.
- `pnpm test` and `pnpm build` must pass locally before an issue is Done.
- The GitHub `Test / Build` check must pass; **"no checks reported" is not success**.
- Modernising a framework or dependency version requires the strategy's **automated and
  manual regression gates** — do not upgrade without them.

**TDD is mandatory** for:

```txt
Word parser logic
Identity resolution
Canonical write-up rules
Pedigree/report assembly
Data migrations
Compatibility fixes affecting queries
```

Cycle:

1. **RED** — write a failing test encoding the acceptance criteria: happy path, edge
   cases, error states.
2. **GREEN** — implement the minimum code required to pass. No extras.
3. **REFACTOR** — improve structure without changing behaviour.
4. **QUALITY** — security, input validation, error handling, and accessibility where
   relevant. If a finding requires a code change, **update the tests first**.

Rules:

- Never write implementation code without a concrete failing test in the mandatory areas.
- Tests derive from Linear acceptance criteria, not from imagination.
- Tests must cover happy paths, edge cases, error states, and regression risks.
- Tests must not call external networks or production services.
- Real client documents are never used as fixtures. Use anonymised or explicitly approved
  fixtures.

### Quality gates

Required before marking an implementation issue Done:

```bash
pnpm test
pnpm build
```

Plus the issue-specific acceptance checks. For Python work, run the extractor test
command documented by the issue.

`lint` and `typecheck` scripts are **not currently configured** in `package.json`. Do not
claim they ran, and do not add them outside an approved issue.

**Never claim a command passed unless it actually ran.** If a command cannot run,
document why and leave the issue incomplete unless its acceptance criteria allow it.

---

## 9. Linear Workflow

Linear is the source of truth for work items. Binding:

1. **Every logical unit of work has its own issue.**
2. Reuse an existing exact-match issue; never create duplicates.
3. **Move the issue to `In Progress` before making any change** to code, configuration,
   documentation, or data — and only after the sources are reconciled (§3).
4. Read the issue, its parent EPIC, dependencies, and acceptance criteria.
5. Implement only that issue. Do not bundle unrelated work.
6. **Linear owns the detailed execution record.** Record files created and modified,
   commands executed, test and build results, manual verification, decisions taken during
   the issue, the exact durable documents the issue changed, commits, Pull Requests, CI
   runs, and blockers.
7. **`Done` is the final lifecycle state.** Move the issue there only after the completion
   lifecycle in §11 has finished — including the final synchronisation check — and never
   merely because code was merged.
8. Never mark `Done` work that depends on Sammy, Marcus, or external material. A falsely
   closed issue is worse than an open one.
9. One issue per commit series. **Every commit message includes `HOR-X`.**
10. Do not move unrelated issues merely to make the board look complete.

Linear stories are execution specifications. Stable product requirements belong in
[automation-mvp.md](docs/requirements/automation-mvp.md).

---

## 10. Git

**The authoritative Git workflow lives in
[docs/git-workflow.md](docs/git-workflow.md).** That document owns the detail; this
section states the rules that bind and points there. It is not duplicated here — where
the two differ, `docs/git-workflow.md` wins on Git mechanics.

**Read [docs/git-workflow.md](docs/git-workflow.md) before creating or modifying:**

```txt
branches
commits
pushes
Pull Requests
merges
release workflows
branch rules
branch cleanup
```

### Permanent branches

`DEV`, `QA` and `main` are permanent.

| Branch | Responsibility |
|---|---|
| `DEV` | Development integration — receives Pull Requests from issue branches |
| `QA` | Functional and technical validation — receives Pull Requests from `DEV` |
| `main` | Stable, releasable version — receives Pull Requests from `QA` only |

They are **never deleted**, locally or remotely. **None accepts direct commits or direct
pushes.** No force push. No rewritten history.

**No direct fast-forward alignment.** `git push origin main:QA`, `git push origin main:DEV`,
a fast-forward push between permanent branches, a direct ref update through the GitHub
API, and `git reset` on a permanent branch are all forbidden. `git pull --ff-only` is
permitted only to update a local branch from its own remote counterpart.

**The three branches are not required to share a SHA.** Each promotion Pull Request
produces its own merge commit, so different SHAs across `DEV`, `QA` and `main` are the
normal, expected state. Verify containment by ancestry, never by hash equality. Never
create an empty commit to make SHAs match.

### Promotion

Every issue uses its own branch, created from `DEV`, named `<prefix>/HOR-X-description`.
Every branch name and every commit message carries the issue ID.

```txt
issue branch → DEV → QA → main
```

Every step is a Pull Request. **No stage may be skipped.** There is no path from an issue
branch to `main`, and none from `DEV` to `main`.

A hotfix branches from `main` and is back-propagated to `QA` and `DEV` by Pull Request —
it is never left only in `main`. See `docs/git-workflow.md` §8.

### Merge method

**Every Pull Request merges with a merge commit.** Squash merge and rebase merge are
forbidden: they rewrite the conventional commits Release Please depends on and make every
later promotion report phantom differences. See `docs/git-workflow.md` §7.

### After reaching `main`

Delete **only** the temporary issue branch, local and remote. **`DEV`, `QA` and `main`
must never be deleted.**

### Checks and evidence

`Test / Build` is the authoritative required check. A green local `pnpm test` and
`pnpm build` is evidence, but it does not replace the real GitHub check. **"No checks
reported" is never a passing check.**

**Automatic Linear closure is not acceptance evidence.** If an integration moves an issue
to `Done`, verify every acceptance criterion; return it to `In Progress` if any is
incomplete. See `docs/git-workflow.md` §13.

### Releases

Release Please opens a release Pull Request targeting `main`. It must pass `Test / Build`
like any other change, it is merged manually, and it never bypasses CI or branch
protection. **Do not merge a generated release Pull Request without explicit
authorisation from Sammy.** See `docs/git-workflow.md` §12.

### Always

Conventional commits; one branch and one worktree per Linear issue; never mention AI,
Claude, Codex, or model names in commit messages; review `git status` for private data
before staging; no destructive Git commands without explicit approval.

---

## 11. Task Lifecycle

One cycle governs every task, from first source consulted to closed issue:

```txt
START → EXECUTE → VERIFY & PROMOTE → RECORD → DOCUMENT DURABLE KNOWLEDGE
→ ENGRAM → SYNCHRONISE → DONE → REPORT
```

### START

1. Run the **Task start lifecycle** in §3: `CLAUDE.md`, Engram, Linear, the relevant
   specialised documents, repository reality — then reconcile, and resolve any conflict by
   Precedence.
2. Move the Linear issue to `In Progress`. **No project file may be modified before this.**
3. Create or switch to the issue branch — mechanics in
   [docs/git-workflow.md](docs/git-workflow.md).
4. State the plan before coding.

### EXECUTE

5. Implement only the assigned issue. Execute RED → GREEN → REFACTOR → QUALITY where TDD
   applies (§8).

### VERIFY & PROMOTE

6. Run the quality gates (§8) and the issue-specific acceptance checks.
7. Review the diff for scope, private data, and destructive changes.
8. Commit with the issue ID, then promote the change through the flow owned by
   [docs/git-workflow.md](docs/git-workflow.md). **A task is not finished because the issue
   branch reached `DEV`** — it is finished when the change reaches `main`, unless the issue
   explicitly requires otherwise.
9. Verify the intended change is actually present in `main`.

### RECORD

10. Finalise the Linear evidence described in §9. Automatic closure by a Git integration is
    not evidence of anything.

### DOCUMENT DURABLE KNOWLEDGE

11. A durable decision discovered or explicitly approved during the work is documented
    **within the same issue, before it closes**, in the document that owns it:

    | Decision | Belongs in |
    |---|---|
    | Product requirement | [automation-mvp.md](docs/requirements/automation-mvp.md) |
    | Architecture decision meeting the ADR criteria | [docs/adr/](docs/adr/) — see §12 |
    | Testing policy | [testing-strategy.md](docs/testing/testing-strategy.md) |
    | Modernisation strategy or progress | [modernisation-plan.md](docs/modernisation/modernisation-plan.md) |
    | Git mechanics | [docs/git-workflow.md](docs/git-workflow.md) |
    | Operational procedure | the appropriate runbook |
    | Agent execution contract or binding agent rule | `CLAUDE.md` |

    Do not open a second documentation issue for a decision that was an integral part of
    the approved work. A separate issue is appropriate only when the documentation is
    genuinely independent work, or was never in the original scope.

    **Linear holds the detailed record; the durable documents hold the knowledge.** Do not
    copy one into the other.

### ENGRAM

12. Only now persist the final state with `mem_save`: the issue completed, important
    decisions, durable documents changed, the resulting development state, corrections to
    previous memory, the next legitimate point of work, and any unresolved blocker. Engram
    must reflect the **final** state after `main`, Linear and the durable documents are
    settled. **Never save an intermediate result as the final memory.**

### SYNCHRONISE

13. Compare `main` ↔ `CLAUDE.md` ↔ the relevant authoritative documents ↔ Linear ↔ Engram.
    The goal is not identical text — it is **consistent facts, each held by the source that
    owns it**. Reconcile by ownership and Precedence, never by timestamp:

    ```txt
    Engram contradicts what main actually contains       → correct Engram
    Linear evidence missing or incomplete                → complete Linear
    An approved durable decision is undocumented         → update the owning document
    CLAUDE.md points at a document that no longer exists → correct the reference
    Engram says In Progress, main and Linear prove done  → correct Engram
    ```

    On an unresolved semantic conflict: **stop and ask Sammy.**

### DONE

14. Move the Linear issue to `Done` only once implementation is complete, the required
    promotion is complete, every acceptance criterion is verified, the Linear evidence is
    complete, the durable documentation is correct, Engram is updated, and the
    synchronisation check succeeded.

### REPORT

15. Report the result.

**Do not start the next issue automatically.**

### Plan format

```md
## Plan

- Issue:
- Goal:
- Scope:
- Files expected to change:
- Tests to add or update:
- Areas explicitly excluded:
- Risks/blockers:
- ADR impact: None | ADR required | ADR update required
```

### Result format

```md
## Result

- Status: Completed | Partially completed | Blocked
- Issue:
- Summary:
- Files created:
- Files modified:
- Commands executed:
- Tests:
- Build:
- Linear updates:
- Commit(s):
- Durable documentation updated:
- Engram memory:
- Synchronisation check:
- Risks / pending decisions:
- Next recommended issue:
```

---

## 12. ADRs

An ADR records a durable architecture decision. Accepted ADRs are binding until
superseded by another ADR — never by an edit to the original.

Create one when a decision changes architecture or data ownership, introduces or replaces
a major technology, changes a durable domain invariant, creates a migration or
compatibility strategy, or must remain understandable months later. Do not create one for
routine implementation details.

**An architecture decision belongs in an ADR, not in `CLAUDE.md`.** This contract points to
the ADR that owns the decision; it never becomes the record of it. Every other kind of
durable decision is routed by the table in §11.

Index and format: [docs/adr/README.md](docs/adr/README.md). Template:
[docs/adr/ADR-template.md](docs/adr/ADR-template.md).

Architecture changes follow: Linear issue → plan → ADR created or updated →
implementation → verification.

---

## 13. Prohibited Actions

```txt
Rewrite the application from scratch
Implement work without a Linear issue
Start work before the sources of truth are reconciled
Modify files before the issue is In Progress
Create duplicate Linear issues
Bundle unrelated work
Commit directly to DEV, QA, or main
Push directly to DEV, QA, or main
Fast-forward push between permanent branches to align them
Create an empty commit to make permanent branch SHAs equal
Squash merge or rebase merge a promotion Pull Request
Delete the permanent DEV, QA, or main branches
Skip a promotion stage or merge into main from anything but QA
Merge a Release Please release Pull Request without Sammy's authorisation
Treat automatic Linear closure as acceptance evidence
Treat "no checks reported" as a passing check
Commit secrets, dumps, or private Word files
Import _legacy code at runtime
Run prisma db pull against the versioned schema
Delete Prisma models or fields without evidence and approval
Patch the database ad hoc to hide schema drift
Run destructive Prisma, SQL, Docker, or Git commands without approval
Silently skip parser entries, Excel rows, or identity conflicts
Overwrite conflicting write-ups
Hide database errors with empty results
Implement beyond the assigned issue
Introduce major dependencies, tools, or patterns without approval
Claim tests or build passed without running them
Continue when sources of truth conflict
Resolve a conflict between sources by timestamp instead of Precedence
Treat Engram as authoritative over ADRs, requirements, or Linear because it is newer
Record a durable architecture decision in CLAUDE.md instead of an ADR
Save an intermediate state to Engram as the final completion state
Mark an issue Done before the final synchronisation check
Start the next issue automatically
```

---

## 14. Final Rule

When uncertain:

```txt
Stop
→ read the sources of truth in the order defined in §3
→ inspect the assigned Linear issue
→ inspect relevant ADRs
→ compare all of it against repository reality
→ ask Sammy
```

Do not guess. Do not expand scope. Do not destroy information. Do not resolve a conflict by
rewriting a source.
