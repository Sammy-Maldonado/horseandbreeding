# ADR-002: Keep MySQL/MariaDB and the Existing Table Names

**Status:** Accepted
**Date:** 2026-07-20
**Deciders:** Sammy Maldonado

---

## Context

The existing system stores pedigree data in a MySQL-family database. The reference dump
`hbold` restores into MariaDB.

The relational core is sound: `storehorse` carries self-relations through `dam_id` and
`sire_id` that rebuild the maternal line correctly, and supporting tables such as
`competition_history` already have a usable shape.

Table names are meaningful and are referenced by the existing application, the legacy
PHP site, and the reference dump.

The project's bottleneck is historical data extraction, not storage technology. Changing
the database engine or renaming tables would add migration risk and rewrite cost without
addressing that bottleneck.

---

## Decision

Keep the MySQL/MariaDB engine family and keep the existing useful table names, including
`storehorse` and `competition_history`.

Rules:

- The database engine is not replaced as part of the Automation MVP.
- Useful existing table names are preserved to keep data migration straightforward.
- New structures are added alongside existing ones rather than replacing them by default.

**This decision does not authorise deletion.** It confers no permission to drop tables,
drop columns, or remove Prisma models or fields. Removal is governed by
[ADR-003](ADR-003-prisma-schema-preservation.md) and always requires evidence, a
dedicated Linear issue, tests, and an approved migration and rollback plan.

---

## Rationale

- Preserves a validated pedigree chain instead of recreating it.
- Keeps the reference dump directly usable for local development.
- Removes an entire class of migration risk from the MVP.
- Keeps naming continuity with the legacy system during the transition period.
- Focuses effort on the actual missing capability: structured write-up data.

---

## Consequences

### Positive

- Data migration stays straightforward.
- Local reference environment restores without conversion work.
- Existing verified pedigree behaviour is retained.
- Lower regression risk across the adopted application.

### Negative

- Legacy naming and historical modelling inconsistencies are inherited.
- Some naming will not match ideal conventions for new code.
- Cleanup of historical schema debt is deferred to a future RFC rather than resolved now.

---

## Alternatives Considered

### Migrate to PostgreSQL — Rejected

Would impose a full data migration and rewrite of database-specific behaviour while the
core data problem remains unsolved. No business requirement demands it.

### Rename tables to modern conventions — Rejected

Cosmetic gain, real cost: breaks continuity with the reference dump and the legacy
system, and creates migration risk for no functional benefit.

### Introduce a replacement ORM — Rejected

Prisma is already in place and understood. Replacing it is out of scope.

---

## Review Triggers

Revisit when:

- a documented requirement cannot be met by the MySQL/MariaDB family;
- a confirmed current production database changes the migration picture;
- an approved schema RFC consolidates naming as part of a tested migration plan;
- operational constraints from deployment make the engine choice untenable.
