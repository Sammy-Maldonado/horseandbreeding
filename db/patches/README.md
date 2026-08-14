# Reference Database Compatibility Patches

**Related:** [ADR-003](../../docs/adr/ADR-003-prisma-schema-preservation.md) ·
[ADR-006](../../docs/adr/ADR-006-storehorse-column-compatibility-layer.md) ·
[ADR-011](../../docs/adr/ADR-011-database-capacity-drift-reconciliation.md) ·
[hbold-baseline.md](../../docs/data/hbold-baseline.md) ·
[local-development.md](../../docs/runbooks/local-development.md)

---

## What lives here

Versioned SQL that brings the local `hbold` reference database into line with a shape
the repository **already declares** in `prisma/schema.prisma` and
`prisma/migrations/`.

`hbold` restores from `_legacy/hbold_backup.sql`, a dump of the legacy PHP application.
Where that dump is behind the accepted schema, restoring it silently reintroduces the
defect. A patch here is the durable answer: it survives the next restore, it is
reviewable, and it states its own evidence.

## What does **not** live here

- **Prisma migrations.** These files are never placed in `prisma/migrations/` and are
  never applied by Prisma. Prisma Migrate owns that directory; a hand-written file in it
  would be read as a migration and corrupt the migration state.
- **Schema invention.** A patch may only reconcile the database with a shape the
  repository already declares. Adding a column that exists in code but has never existed
  in any real database is forbidden — that is presence drift, and
  [ADR-006](../../docs/adr/ADR-006-storehorse-column-compatibility-layer.md) rejected it
  in favour of a runtime compatibility layer.
- **Production changes.** These patches target the local reference database. Production
  data is never modified without explicit approval.
- **Data edits.** A patch changes structure. It does not insert, update, delete, or
  reset rows.

The boundary between "reconcile" and "invent" is
[ADR-011](../../docs/adr/ADR-011-database-capacity-drift-reconciliation.md). Read it
before adding a patch.

## Rules

1. Every patch has its own Linear issue, and the issue ID appears in the filename and in
   the file header.
2. Every patch is **idempotent** — running it twice is a no-op, not an error.
3. Every patch is **self-verifying** — it ends with a `SELECT` that reports the resulting
   shape.
4. Every patch states, in its header, why it exists, why it is safe, and how to run it.
5. A patch changes the minimum. It touches one concern and never widens its own scope.
6. A patch is never edited after it has been applied. Supersede it with a new one.

## Naming

```txt
<sequence>-<HOR-issue>-<short-description>.sql
```

Example: `001-HOR-74-users-password-varchar100.sql`

## Applying

Patches are applied after a reference dump restore, in sequence order. The restore
procedure and this step live in
[local-development.md](../../docs/runbooks/local-development.md) §5.

```bash
docker exec -i hb-mysql \
  mariadb -uroot -p<local-password> hbold \
  < db/patches/001-HOR-74-users-password-varchar100.sql
```

Because every patch is idempotent, re-running the whole directory against an
already-patched database is safe.

## Index

| Patch | Issue | Reconciles |
|---|---|---|
| [001-HOR-74-users-password-varchar100.sql](001-HOR-74-users-password-varchar100.sql) | HOR-74 | `users.password` varchar(50) → varchar(100), so a 60-character bcrypt hash fits |
