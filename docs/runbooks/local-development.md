# Local Development Runbook — Horse & Breeder

**Related:** [hbold-baseline.md](../data/hbold-baseline.md) · [ADR-003](../adr/ADR-003-prisma-schema-preservation.md) · [ADR-004](../adr/ADR-004-pnpm-package-manager.md)

---

## 1. Prerequisites

Verify:

```bash
node --version
pnpm --version
docker --version
python --version
```

The authoritative pnpm version is the one declared in `package.json` under
`packageManager` — see [ADR-004](../adr/ADR-004-pnpm-package-manager.md).

---

## 2. Install Node Dependencies

```bash
pnpm install --frozen-lockfile
```

Dependency install scripts are blocked by default. Do not approve a new one without an
issue and review; legitimate exceptions are declared under `allowBuilds` in
`pnpm-workspace.yaml`.

---

## 3. Environment File

Create the local `.env` from the versioned template:

```bash
cp .env.example .env
```

Then fill in the local values. `.env.example` carries **variable names and safe
placeholders only** — never real values.

The real `.env` stays untracked and is never committed, printed, or quoted in
documentation or issues.

Local connection shape:

```env
DATABASE_URL="mysql://root:<local-password>@127.0.0.1:3306/hbold"
```

---

## 4. Local MariaDB

The `hbold` dump originates from a MariaDB-family database, so the local instance runs
MariaDB rather than MySQL 8 — closer to the source, fewer conversion surprises.

Expected container:

```txt
hb-mysql
```

Check status:

```bash
docker ps --filter name=hb-mysql
```

Start an existing stopped container:

```bash
docker start hb-mysql
```

Create **only when it does not exist**:

```bash
docker run -d --name hb-mysql \
  -e MARIADB_ROOT_PASSWORD=<local-password> \
  -e MARIADB_DATABASE=hbold \
  -p 3306:3306 \
  mariadb:10.11
```

---

## 5. Reference Dump Restore — Already Executed

**The reference restore has already been performed. This section is historical record,
not a step to repeat now.**

Re-running it is a destructive operation against the local database and requires a
dedicated reason and approval. Do not re-import over a working environment.

The procedure originally used:

```bash
docker exec -i hb-mysql \
  mariadb -uroot -p<local-password> hbold \
  < _legacy/hbold_backup.sql
```

Restore only into an empty or newly created local database.

### 5.0 Since HOR-79 — restore is followed by the migration history

Since HOR-79
([ADR-012](../adr/ADR-012-prisma-migrate-baseline-and-staged-innodb-modernisation.md)),
the local `hbold` carries the versioned Prisma Migrate history. A rebuild is no longer
"restore + patches"; it is:

```bash
# 1. Clean restore of the legacy dump into a fresh database (as above), then:
DATABASE_URL=<local-hbold-url> pnpm exec prisma migrate resolve --applied 0_init
DATABASE_URL=<local-hbold-url> pnpm exec prisma migrate deploy
```

`0_init` is a faithful baseline of the legacy dump, so it is marked applied — never
executed — on a restored database. On an **empty** database, skip the `resolve` and run
`migrate deploy` alone; both paths produce the identical schema.

A migrated `hbold` already has `users.password varchar(100)`, so §5.1 below applies
only to a bare legacy restore that has not been migrated.

### 5.1 Post-restore compatibility patches — required on unmigrated restores only

**A restore is not finished until the patches in [`db/patches/`](../../db/patches/) have
been applied.** The dump reflects the legacy PHP application, and in places it is behind
the shape the versioned Prisma schema declares. Restoring it alone reintroduces defects
that were already fixed.

Apply every patch, in filename order:

```bash
docker exec -i hb-mysql \
  mariadb -uroot -p<local-password> hbold \
  < db/patches/001-HOR-74-users-password-varchar100.sql
```

Each patch prints the resulting column shape, so you can read the outcome directly. Every
patch is idempotent, so re-running the directory against an already-patched database is
safe and is the quickest way to confirm the environment is current.

Skipping this step reproduces HOR-74: `users.password` stays `varchar(50)`, a
60-character bcrypt hash does not fit, and **every registration fails** with
`The provided value for the column is too long for the column's type. Column: password`.

What may and may not be reconciled this way is governed by
[ADR-011](../adr/ADR-011-database-capacity-drift-reconciliation.md). The convention is
documented in [db/patches/README.md](../../db/patches/README.md).

---

## 6. Sanity Checks

These are **read-only** and safe to run at any time.

List databases:

```bash
docker exec hb-mysql \
  mariadb -uroot -p<local-password> \
  -e "SHOW DATABASES;"
```

Count horses:

```bash
docker exec hb-mysql \
  mariadb -uroot -p<local-password> hbold \
  -e "SELECT COUNT(*) AS total FROM storehorse;"
```

### Interpreting the count

| Result | Meaning |
|---|---|
| **59,903** | Exact expected count for a correct full restore |
| **56,000+** | Approximate completeness threshold — right order of magnitude, not the exact count |
| **approximately 8,700** | **Partial import. This is WRONG.** |

The `56,000+` figure is a historical sanity **threshold**, not the current count. Always
compare against the exact **59,903**.

A result near 8,700 means only one of the dump's **multiple `INSERT INTO storehorse`
blocks** was processed. The dump does not load `storehorse` in a single statement. If you
see this figure, investigate the restore — do not adjust expectations, and do not draw
data-model conclusions from the partial set.

Full baseline and schema-drift detail: [hbold-baseline.md](../data/hbold-baseline.md).

---

## 7. Safe Prisma Introspection

Prisma 7 notes (ADR-015): the CLI no longer auto-loads `.env` — the repository's
`prisma.config.ts` loads it and declares the datasource, so every `pnpm exec prisma …`
command below works exactly as before as long as `.env` exists. The client is generated
into `generated/prisma/`, which is **gitignored**; `pnpm install` regenerates it via the
`postinstall` script, so a fresh clone needs no extra step.

Safe — prints to stdout, leaves the versioned schema untouched:

```bash
pnpm exec prisma db pull --print
```

**Unsafe — never run this:**

```bash
pnpm exec prisma db pull
```

It rewrites `prisma/schema.prisma` in place and would silently drop the models that exist
in code but not in `hbold`.

Governed by [ADR-003](../adr/ADR-003-prisma-schema-preservation.md).

---

## 8. Run the Application

```bash
pnpm dev
```

Nuxt may choose another port when 3000 is occupied.

A running `pnpm dev` holds a lock that blocks `pnpm build`. Stop the dev server before
building.

---

## 9. Tests and Build

This section is the **how** — the exact commands to run locally. The **what and why** —
test categories, placement, fixtures, data safety, and the gates required before
modernising a dependency — live in the authoritative
[testing strategy](../testing/testing-strategy.md). When the two touch the same ground, the
strategy owns the policy and this runbook owns the commands.

```bash
pnpm test
pnpm build
```

These are the two quality gates required before an implementation issue can be marked
Done. `pnpm test` runs the whole suite headless and is the exact command CI runs.

There are **no `lint` or `typecheck` scripts** in `package.json` at present. Do not
document or claim them as available commands, and do not add them outside an approved
issue.

### Test harness — two projects

Vitest is split into two isolated projects ([vitest.config.ts](../../vitest.config.ts)) so
fast server-side unit tests never pay for a browser-like environment:

| Project | Environment | Runs | Loads Nuxt? |
|---|---|---|---|
| `node` | `node` | `*.test.ts` / `*.spec.ts` (e.g. `server/utils`) | No |
| `nuxt` | `nuxt` + happy-dom | `*.nuxt.test.ts` only | Yes |

The `*.nuxt.test.ts` suffix is the single switch that routes a file to exactly one
project, so no test file is ever executed twice. Name a test by what it needs:

- **`*.test.ts`** — pure logic, no Vue/Nuxt runtime. Fast; no Nuxt boot.
- **`*.nuxt.test.ts`** — components, composables, or anything needing Nuxt auto-imports.
  Runs in a real Nuxt context with **happy-dom** as the DOM (jsdom is intentionally not
  installed).

Run one project or one file in isolation:

```bash
pnpm test --project node                          # only the Node tests
pnpm test --project nuxt                           # only the Nuxt tests
pnpm test RecursiveCompetitionHistory              # only files matching the name
```

### Component tests

Component tests mount through `mountSuspended` from `@nuxt/test-utils/runtime` and use
small in-memory fixtures. They **never connect to `hbold`** or any database, and never use
real client documents. Example: [components/RecursiveCompetitionHistory.nuxt.test.ts](../../components/RecursiveCompetitionHistory.nuxt.test.ts),
run it directly with:

```bash
pnpm test RecursiveCompetitionHistory
```

Booting the Nuxt environment regenerates `.nuxtrc` (git-ignored) — that is expected and
must not be committed.

---

## 10. Extractor

The Python extractor is a separate module, isolated from the Node toolchain.

Install:

```bash
pip install -r extractor/requirements.txt
```

Run:

```bash
python extractor/parse_dams.py <catalogue.docx> > out.json
```

Its only third-party dependency is `python-docx`, pinned in
`extractor/requirements.txt`; everything else it uses is Python standard library.

Input documents live under:

```txt
data/private/catalogues/
```

Do not commit real source documents or generated client output.

Grammar reference: [writeup-grammar.md](../domain/writeup-grammar.md).

---

## 11. Troubleshooting

### A query references a column absent from `hbold`

- Confirm the actual database schema.
- Search the Prisma model and query path.
- Create or use a dedicated Linear compatibility issue.
- Add a regression test.
- Prefer an explicit minimal query projection when justified.
- **Do not add columns or delete Prisma fields as an ad-hoc fix.**

### A write fails with "the provided value ... is too long for the column's type"

The column exists but is narrower in `hbold` than the versioned schema declares — capacity
drift, not presence drift.

- Confirm the declared width in `prisma/schema.prisma` and in `prisma/migrations/`.
- Compare it against the live column with
  `SHOW COLUMNS FROM <table> LIKE '<column>';`.
- Check whether a patch in [`db/patches/`](../../db/patches/) already covers it and was
  simply not applied after the last restore — see §5.1.
- If none does, this needs a Linear issue and
  [ADR-011](../adr/ADR-011-database-capacity-drift-reconciliation.md)'s five conditions
  satisfied before a new patch is written.
- **Do not** widen the column with an ad-hoc `ALTER`; the next restore undoes it.

### Prisma introspection differs from the committed schema

Treat it as evidence of schema drift, not as permission to overwrite. The measured drift
is documented in [hbold-baseline.md](../data/hbold-baseline.md).

### A private file appears in `git status`

Stop before staging.

```bash
git check-ignore -v <path>
git status --short
```

Update `.gitignore` through a dedicated Linear issue.

### `pnpm build` fails with a lock error

Another Nuxt process is running. Stop the dev server and retry rather than bypassing the
lock.
