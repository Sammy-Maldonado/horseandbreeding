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

```bash
pnpm test
pnpm build
```

These are the two quality gates required before an implementation issue can be marked
Done.

There are **no `lint` or `typecheck` scripts** in `package.json` at present. Do not
document or claim them as available commands, and do not add them outside an approved
issue.

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
