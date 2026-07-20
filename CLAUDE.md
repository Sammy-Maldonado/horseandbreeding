# CLAUDE.md — Horse & Breeder Agent Contract

## 1. Purpose

This file is the **authoritative execution contract** for coding agents in this
repository. It defines how work is authorised, bounded, verified, and recorded.

It states rules. It does not restate the documents it points to — detail lives in the
specialised documents listed in section 3.

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
| `CLAUDE.md` | Agent rules, invariants, prohibited actions |
| [docs/requirements/automation-mvp.md](docs/requirements/automation-mvp.md) | Stable functional requirements, business rules, acceptance scenarios |
| [docs/adr/](docs/adr/) | Accepted architecture decisions — binding until superseded |
| [docs/architecture/existing-assets.md](docs/architecture/existing-assets.md) | Reusable technical inventory |
| [docs/data/hbold-baseline.md](docs/data/hbold-baseline.md) | Reference database baseline and schema drift |
| [docs/domain/writeup-grammar.md](docs/domain/writeup-grammar.md) | Historical Word write-up grammar |
| [docs/git-workflow.md](docs/git-workflow.md) | Branching, commits, PRs, private-data review |
| [docs/runbooks/local-development.md](docs/runbooks/local-development.md) | Local setup, database, extractor, troubleshooting |
| Linear | Work status, ownership, priority, dependencies, acceptance-criteria completion |

Before implementing any task, read `CLAUDE.md`, the assigned Linear issue and its parent
EPIC, and the specialised documents relevant to the area being changed.

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
- **The Word archive is the source of truth for historical write-ups**, not the database
  text fields.
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
   documentation, or data.
4. Read the issue, its parent EPIC, dependencies, and acceptance criteria.
5. Implement only that issue. Do not bundle unrelated work.
6. Record files, commands, results, decisions, and blockers in the issue.
7. Move to `Done` only after all acceptance criteria and quality gates actually pass.
8. Never mark `Done` work that depends on Sammy, Marcus, or external material. A falsely
   closed issue is worse than an open one.
9. One issue per commit series. **Every commit message includes `HOR-X`.**
10. Do not move unrelated issues merely to make the board look complete.

Linear stories are execution specifications. Stable product requirements belong in
[automation-mvp.md](docs/requirements/automation-mvp.md).

---

## 10. Git

Full workflow: [docs/git-workflow.md](docs/git-workflow.md).

Binding summary: `main` is stable and never receives direct commits; one branch and one
worktree per Linear issue; branch names and commit messages carry the issue ID;
conventional commits; never mention AI, Claude, Codex, or model names in commit
messages; review `git status` for private data before staging; no destructive Git
commands without explicit approval.

---

## 11. Implementation Workflow

1. Read the required sources of truth.
2. Confirm the working tree and branch.
3. Read the assigned Linear issue.
4. Move it to `In Progress`.
5. State the plan before coding.
6. Execute RED → GREEN → REFACTOR → QUALITY when TDD applies.
7. Run the relevant quality gates.
8. Review the diff for scope, private data, and destructive changes.
9. Commit with the issue ID.
10. Record evidence in Linear.
11. Move to `Done` only when complete.
12. Report the result.

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

Index and format: [docs/adr/README.md](docs/adr/README.md). Template:
[docs/adr/ADR-template.md](docs/adr/ADR-template.md).

Architecture changes follow: Linear issue → plan → ADR created or updated →
implementation → verification.

---

## 13. Prohibited Actions

```txt
Rewrite the application from scratch
Implement work without a Linear issue
Modify files before the issue is In Progress
Create duplicate Linear issues
Bundle unrelated work
Commit directly to main
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
Start the next issue automatically
```

---

## 14. Final Rule

When uncertain:

```txt
Stop
→ read the sources of truth
→ inspect the assigned Linear issue
→ inspect relevant ADRs
→ ask Sammy
```

Do not guess. Do not expand scope. Do not destroy information.
