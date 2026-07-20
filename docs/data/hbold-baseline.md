# `hbold` Reference Database Baseline

**Status:** Active — reference baseline
**Scope:** The restored local `hbold` reference database and its relationship to the versioned Prisma schema
**Related:** [ADR-003](../adr/ADR-003-prisma-schema-preservation.md) · [ADR-002](../adr/ADR-002-mysql-mariadb-and-table-names.md) · [local-development.md](../runbooks/local-development.md)

---

## 1. Purpose

This document records the measured baseline of the restored local `hbold` database so
that schema drift, partial imports, and data gaps are diagnosed from evidence rather
than assumption.

`hbold` is an **older reference database**. It is not the current production schema and
must never be treated as authoritative over the versioned Prisma schema.

Throughout this document, exact figures and approximate figures are labelled
separately. Do not blur them.

---

## 2. Row counts for `storehorse`

| Figure | Value | Nature | Meaning |
|---|---|---|---|
| Current validated exact count | **59,903 rows** | Exact | The expected result of a correct full restore |
| Historical completeness threshold | **56,000+ rows** | Approximate threshold | A restore in this range or above is plausibly complete |
| Partial-import signature | **approximately 8,700 rows** | Approximate | A restore in this range is WRONG and incomplete |

### 2.1 On the 56,000+ threshold

`56,000+` is an **approximate completeness threshold recorded during earlier work**, not
the current exact count. Earlier notes cited a figure near 56,395; that figure is
superseded as an exact value.

Use `56,000+` only as a sanity threshold — "this restore is in the right order of
magnitude". Use **59,903** as the exact expected count.

Never present the threshold as the current count.

### 2.2 Why a partial import shows approximately 8,700

The `hbold` dump does not insert `storehorse` in a single statement. It contains
**multiple separate `INSERT INTO storehorse` blocks** (recorded as seven during earlier
analysis).

A process that reads or applies only the **first** block sees roughly 8,700 rows and
concludes the table is small. This is a known trap and has already produced a wrong
conclusion once during this project.

If a count lands near 8,700:

- the restore or the parsing of the dump is incomplete;
- the correct action is to investigate the restore, not to adjust expectations;
- do not draw data-model conclusions from the partial set.

---

## 3. Schema drift: Prisma versus `hbold`

| Figure | Value | Nature |
|---|---|---|
| Models declared in the versioned `prisma/schema.prisma` | **41 models** | Exact |
| Tables present in restored `hbold` | **30 tables** | Exact |

Eleven models exist in the versioned Prisma schema but **not** in `hbold`:

```txt
access_tokens
areas
authorization_codes
clients
horse_views
refresh_tokens
scopes
sellers
user_role_scope
user_roles
vendor
```

These back the application's authentication, sellers and analytics features.

### 3.1 Interpretation — binding

Their absence is evidence that **`hbold` predates the application schema**. It is
**NOT** evidence that the models are obsolete, junk, or safe to delete.

Deleting them would silently remove working application capabilities.

Schema preservation is governed by
[ADR-003](../adr/ADR-003-prisma-schema-preservation.md). Any removal requires confirmed
evidence, a dedicated Linear issue, explicit acceptance criteria, tests, and an approved
migration and rollback plan.

### 3.2 Introspection safety

Never run `prisma db pull` against the versioned schema — it rewrites the file in place
and would drop the eleven code-only models. Use:

```bash
pnpm exec prisma db pull --print
```

or point `--schema` at a throwaway file containing only `generator` and `datasource`
blocks.

---

## 4. Content gaps

| Table / field | Observed state | Nature |
|---|---|---|
| `competition_history` | approximately 454 rows | Approximate |
| `storehorse.remarks` | approximately 79 horses carry partial text | Approximate |

`competition_history` has the right shape but was never populated. Filling it from
Word extraction is the core work of this project.

`storehorse.remarks` holds only fragmentary test content, with no complete write-ups.

**Consequence:** the Word archive — not the database — is the primary source of truth
for historical write-ups. See [writeup-grammar.md](../domain/writeup-grammar.md).

---

## 5. Data recency

- `hbold` contains data up to approximately **2024**.
- A **more recent database copy may exist**. This is **not confirmed**.
- Do not assume `hbold` is the latest available data.
- Confirmation of a newer copy is an external dependency and is tracked in Linear.

---

## 6. Verification status of this document

| Item | Status in the current run |
|---|---|
| Prisma model count (41) | Revalidated by counting `model` declarations in `prisma/schema.prisma` |
| The eleven code-only model names | Recorded from earlier verified analysis; not re-queried |
| `storehorse` count of 59,903 | **Not revalidated in this run** |
| `hbold` table count (30) | **Not revalidated in this run** |
| `competition_history` and `remarks` figures | **Not revalidated in this run** |

The database figures could not be revalidated because the local `hb-mysql` container was
stopped and the local credential required to query it lives in `.env`, which the current
work item is not permitted to open.

Revalidating these figures requires starting the container and running a read-only
count, as described in [local-development.md](../runbooks/local-development.md). It does
not require, and must not trigger, another restore.
