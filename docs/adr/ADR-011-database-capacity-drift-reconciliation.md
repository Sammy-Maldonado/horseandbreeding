# ADR-011: Reconcile Capacity Drift in `hbold` with Versioned SQL Patches

**Status:** Accepted
**Date:** 2026-08-14
**Deciders:** Sammy Maldonado

---

## Context

[ADR-006](ADR-006-storehorse-column-compatibility-layer.md) settled what to do when the
application declares a column that `hbold` has never contained: build a runtime
compatibility layer, and **do not add the column to the database**. That decision was
right, and it stands.

HOR-74 surfaced a different failure that the same rule would have answered wrongly.

`users`.`password` **exists** in `hbold`. It is simply too narrow:

| Source | Declared shape |
|---|---|
| `prisma/schema.prisma` | `@db.VarChar(100)` |
| `prisma/migrations/20241010194110_y/migration.sql` | `VARCHAR(100) NOT NULL` |
| `_legacy/hbold_backup.sql` — the restore source | `varchar(50) NOT NULL DEFAULT ''` |
| Restored `hbold` | `varchar(50)` |

`server/api/user.put.ts` hashes with bcrypt at 10 salt rounds, producing a fixed
60-character digest. 60 does not fit in 50, so **every registration was rejected** by the
database:

```txt
The provided value for the column is too long for the column's type. Column: password
```

### Two different kinds of drift

The distinction matters, because the correct response is opposite in each case.

| | **Presence drift** (ADR-006) | **Capacity drift** (this ADR) |
|---|---|---|
| Symptom | The column does not exist | The column exists but is too small |
| Correct target shape | **Unknown** — no real database has ever had it | **Known** — declared by the versioned schema *and* a versioned migration |
| Adding it to `hbold` would | Invent schema on a guess | Reproduce a shape the repository already committed to |
| Code-side workaround | Possible — suppress the filter | **Impossible** — a 60-character digest cannot be made to fit 50 without weakening the hash |
| Decision | Runtime compatibility layer | Reconcile the database |

ADR-006 rejected "add the column to local `hbold`" because it *"invents schema without
evidence that it matches any real database."* That objection does not apply here. The
evidence is in the repository: a versioned Prisma migration declared `VARCHAR(100)`
before this issue existed. `varchar(50)` is the legacy PHP shape the dump carries, and
the reference database is simply behind the schema the application is generated from.

### Why a one-off `ALTER` is not enough

`hbold` restores from `_legacy/hbold_backup.sql`, which declares `varchar(50)`. A manual
`ALTER` fixes one developer's machine and is silently undone by the next restore. The
repair has to be an artefact, not an action.

---

## Decision

**Capacity drift in the reference database is reconciled with an idempotent, versioned
SQL patch under `db/patches/`.**

A patch is permitted only when all of the following hold:

1. The column **already exists** in `hbold`. Absent columns remain ADR-006 territory.
2. The target shape is **already declared by the repository** — in
   `prisma/schema.prisma` and in `prisma/migrations/`. A patch reconciles; it never
   invents.
3. The change is **non-destructive by construction** — widening, never narrowing; no
   change of type, character set, collation, nullability, position, or default.
4. **No code-side workaround exists** that preserves correct behaviour.
5. The change is proven safe against the live data before it is applied.

Every patch:

- has its own Linear issue, carried in the filename and the file header;
- is **idempotent** — running it twice is a no-op, not an error;
- is **self-verifying** — it ends with a `SELECT` reporting the resulting shape;
- states in its header why it exists, why it is safe, and how to run it;
- is applied after a reference-dump restore, per
  [local-development.md](../runbooks/local-development.md) §5;
- is never edited after being applied — supersede it with a new one.

The convention is documented in [db/patches/README.md](../../db/patches/README.md).

### What this ADR does not authorise

- **Adding a column, table, or index that is absent from `hbold`.** That is presence
  drift, and ADR-006 governs it.
- **Modifying `prisma/schema.prisma`.** [ADR-003](ADR-003-prisma-schema-preservation.md)
  is untouched; the schema was already correct and was not edited for HOR-74.
- **Using Prisma as the mechanism.** These patches are not Prisma migrations and are
  never placed in `prisma/migrations/`. Prisma Migrate owns that directory, and a
  hand-written file inside it would be read as a migration and corrupt the migration
  state. `prisma db push`, `prisma migrate dev`, and `prisma migrate reset` remain
  forbidden.
- **Touching production data.** These patches target the local reference database.
- **Changing rows.** A patch changes structure. It never inserts, updates, deletes, or
  resets data — passwords least of all.

---

## Rationale

- The database was wrong and the code was right. Bending the code to fit a legacy column
  width would have meant weakening or truncating a password hash — a security defect
  traded for a schema defect.
- The repair survives the next restore, which a manual `ALTER` does not.
- A versioned, reviewable artefact carries its own evidence. The next person reads why
  the patch exists instead of rediscovering the drift through a failed registration.
- Widening a `varchar` is one of the few schema changes that provably cannot lose
  information, which is what makes this class safe enough to automate.
- Keeping the rule narrow — existing column, already-declared target, widening only —
  means it cannot grow into "patch the database whenever the code disagrees with it",
  which is exactly what ADR-006 was written to prevent.

---

## Consequences

### Positive

- Registration works against `hbold`, and a stored bcrypt digest is no longer at risk of
  truncation.
- Introspecting the live database now reports `@db.VarChar(100)` for `users.password`, so
  the schema and the reference database agree on this column.
- Restores are repeatable: run the dump, then run `db/patches/` in order.
- The presence/capacity distinction is written down, so the next drift incident is
  classified rather than argued.

### Negative

- A second place to look. A developer must know that a correct restore is
  "dump **plus** patches", and the runbook has to say so.
- `db/patches/` is debt, exactly as ADR-006's compatibility layer is. It should shrink,
  not grow. A current reference dump would delete it.
- The rule needs judgement at its boundary. "Already declared by the repository" is the
  load-bearing clause, and it must be evidenced in the Linear issue every time.

---

## Alternatives Considered

### Shorten or truncate the hash to fit `varchar(50)` — Rejected

The only way a bcrypt digest fits 50 characters is by storing part of it. A truncated
hash is not a hash. This trades a schema defect for a security defect.

### Switch to a hashing algorithm with a shorter output — Rejected

Redesigns authentication to accommodate a legacy column width, which is the tail wagging
the dog. It also invalidates any existing bcrypt digest and reaches far outside the
issue's scope.

### A runtime compatibility layer, as in ADR-006 — Rejected

There is nothing to suppress. ADR-006 works because a `status` filter can be omitted and
still return a correct — if broader — result. A password has to be written in full or not
at all. No layer can make 60 characters fit in 50.

### A manual one-off `ALTER` on each developer's machine — Rejected

Works once, then the next restore of `_legacy/hbold_backup.sql` silently reintroduces the
defect. It also leaves no record of why the change was made.

### A Prisma migration — Rejected

The versioned migration **already declares `VARCHAR(100)`**. The schema is not what
drifted; the reference dump is. Adding a migration would misrepresent the cause, and
running Prisma Migrate against `hbold` risks the destructive commands ADR-003 forbids.

### Regenerate `hbold` from a corrected dump — Rejected

Editing `_legacy/hbold_backup.sql` would modify a protected reference artefact and
require re-importing the whole dataset to fix one column width. Disproportionate, and it
destroys the drift evidence.

---

## Review Triggers

Revisit — and prefer deleting `db/patches/` — when:

- a confirmed current reference database is provided (HOR-32) and no longer needs
  reconciliation;
- a schema RFC settles the authoritative shape of the dataset (HOR-7);
- a patch is proposed that does not satisfy all five conditions above — that is a signal
  the rule is being stretched, and it needs a decision, not a patch;
- the same column drifts again, which would mean the restore source itself must be
  addressed.
