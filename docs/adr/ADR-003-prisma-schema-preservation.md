# ADR-003: Preserve the Prisma Schema When Working Against Legacy `hbold`

**Status:** Accepted
**Date:** 2026-07-20
**Deciders:** Sammy Maldonado

---

## Context

The committed Prisma schema contains models and fields not present in the restored
`hbold` database. Measured baseline: **41 models** declared in
`prisma/schema.prisma` against **30 tables** in `hbold`, with eleven models existing
only in code. The full list and interpretation are recorded in
[hbold-baseline.md](../data/hbold-baseline.md).

Those eleven models back the application's authentication, sellers and analytics
features. The restored database is **older** than parts of the current application.

Running Prisma introspection directly against the versioned schema rewrites the file in
place and would silently drop every code-only model, producing a destructive change that
looks like a routine sync.

Absence from `hbold` is not proof that an application model or field is obsolete.

---

## Decision

Preserve the committed Prisma schema while `hbold` is treated as an older reference
database.

Rules:

- **Never run `prisma db pull` directly against `prisma/schema.prisma`.**
- Use `pnpm exec prisma db pull --print`, or point `--schema` at a throwaway file
  containing only `generator` and `datasource` blocks.
- Do not delete models or fields based only on absence from `hbold`.
- Do not add database columns as ad-hoc compatibility patches.
- Every removal or migration requires its own Linear issue, confirmed evidence, explicit
  acceptance criteria, tests, an approved migration plan, and a rollback plan.
- Compatibility fixes prefer explicit, minimal query projections over destructive schema
  changes.
- Do not reset a database or run destructive Prisma commands.
- Verify backups before any destructive or irreversible operation.

Cleanup candidates identified during exploration — such as `marcustest`,
`storehorse_new`, and dirty column defaults — are input to a future schema RFC. They are
**not** a licence to delete during exploration.

---

## Rationale

- Prevents accidental loss of application schema.
- Acknowledges version drift explicitly instead of hiding it.
- Keeps local development possible without pretending `hbold` is the latest schema.
- Forces destructive decisions to be reviewed and traceable.

---

## Consequences

### Positive

- Safer local introspection.
- Clear handling of schema drift.
- Better migration discipline.
- Reduced risk of silently breaking newer application features.

### Negative

- Some queries may require compatibility projections or adapters.
- Local `hbold` cannot validate every application model.
- A newer database copy may still be required for full migration planning.
- Schema debt persists longer than it would under aggressive cleanup.

---

## Alternatives Considered

### Replace the Prisma schema with `db pull` output — Rejected

Would silently remove models and fields not present in `hbold`.

### Add every missing field to local `hbold` — Rejected

Would create an invented schema without proof that it matches the current application
database.

### Delete code-only models — Rejected

Their absence from an older dump is not sufficient evidence.

---

## Review Triggers

Revisit when:

- a confirmed current database is provided;
- a schema RFC identifies authoritative models;
- a tested migration plan is approved;
- production deployment requires a single canonical schema.
