# ADR-012: Prisma Migrate baseline and staged InnoDB modernisation

**Status:** Accepted
**Date:** 2026-08-15
**Deciders:** Sammy

---

## Context

The database had no migration history at all. No `_prisma_migrations` table existed in
any environment; every schema change so far was applied by hand or through the ADR-011
capacity patches. The single migration the previous developer generated
(`20241010194110_y`, October 2024) was never recorded as applied anywhere, fails when
executed against the real schema, and mixes never-applied intentions with structures
that were later created by other means.

Meanwhile the modern authentication design (HOR-76/HOR-79) requires real foreign keys
into `users`. The historical database is 30 tables, 24 of them MyISAM — including
`users` — and MyISAM cannot enforce foreign keys: a MyISAM-child constraint is parsed
and silently ignored, and an InnoDB-child constraint pointing at a MyISAM parent fails
outright (errno 150). The legacy baseline also carries structural debt that blocks a
full one-shot modernisation: duplicate key pairs in two association tables
(`storehorse_has_approvedby`: 52 duplicate pairs, `studbook_has_storehorse`: 16 696
duplicate pairs) prevent their intended composite primary keys, and deduplication is a
destructive business-data decision that has not been authorised.

A decision was needed on how schema evolution is versioned from now on, and how far the
first modernisation wave may go.

---

## Decision

1. **Prisma Migrate is the single versioned mechanism for schema evolution.** The
   active history starts at `prisma/migrations/0_init/`, a faithful structure-only
   baseline of the historical 30-table database taken from a clean restore of
   `_legacy/hbold_backup.sql` — engines, charsets, collations, defaults, keys and
   indexes preserved exactly, including the 24 MyISAM tables. The baseline is recorded
   as applied (`prisma migrate resolve --applied 0_init`) on databases that already
   contain the legacy schema, and executed normally on empty databases. Both paths must
   converge to the identical schema.
2. **`20241010194110_y` is removed from the active chain and archived unmodified** in
   `prisma/migrations-archive/`, as evidence of the previous developer's intent. It is
   never edited, repaired, or executed.
3. **Modernisation proceeds in explicit, separate waves.** This wave converts exactly
   one engine — `users` to InnoDB — because `users` is the parent of every modern
   authentication foreign key. Engine waves and charset/collation waves are never
   combined in one migration. Remaining MyISAM tables are converted in later waves;
   MyISAM is treated as debt to retire, never as a constraint that shapes new
   architecture.
4. **New authentication structures are InnoDB, `utf8mb4`, with real enforced foreign
   keys** — only between InnoDB tables. Token credentials are never stored: the client
   receives an opaque cryptographically random value and the database persists only its
   SHA-256 digest in `token_hash BINARY(32) UNIQUE`, with a surrogate integer primary
   key. Refresh rotation replaces the row; a digest miss is a replay and is rejected.
   Role names are unique per user (`UNIQUE(role_name, user_id)`), not globally.
5. **What the legacy data cannot yet support is deferred and documented, never
   forced.** Deferred with evidence: the 17 schema-declared foreign keys that touch
   MyISAM tables, the two composite primary keys blocked by duplicate pairs, and the
   `storehorse.height` widening (owned by HOR-82). The residual `migrate diff` between
   a fully migrated database and `prisma/schema.prisma` must contain exactly this list
   and nothing else.

---

## Rationale

- A baseline that mirrors the real historical schema is the only starting point from
  which `migrate deploy` behaves identically on a legacy restore and on an empty
  database. Silently converting the baseline to InnoDB or utf8mb4 would fabricate a
  history that never existed and make the two paths diverge.
- Converting only `users` keeps the wave minimal and reversible while unblocking every
  authentication foreign key. Converting more engines now would widen the blast radius
  without an issue that requires it.
- Deduplicating association rows or dropping legacy structures to satisfy the target
  schema would destroy business data by assumption — exactly what the conflict policy
  forbids.
- Storing token digests instead of tokens means a database leak exposes no usable
  credential, and `BINARY(32)` makes the lookup index compact and constant-width.

---

## Consequences

### Positive

- Schema changes are versioned, reviewable, and reproducible from either a legacy
  restore or an empty database.
- Real referential integrity for the authentication domain.
- The previous developer's intent is preserved as evidence without contaminating the
  active chain.
- Each deferral is explicit, measurable, and owned by a follow-up issue.

### Negative

- The schema declares more foreign keys than the database can currently enforce; the
  residual diff is non-empty by design and must be re-checked against the documented
  deferral list whenever migrations change.
- Mixed engines and charsets persist until later waves; queries joining InnoDB and
  MyISAM tables get no cross-engine integrity guarantees.
- Every new environment must follow the baseline procedure (resolve vs deploy)
  correctly; applying `0_init` to a database that already has the schema without
  `resolve` would fail.

---

## Alternatives Considered

### Adopt `20241010194110_y` as the first migration — Rejected

It was never applied anywhere, fails against the real schema, and repairing it would
falsify history. Archiving preserves the evidence without the risk.

### Baseline the modern 41-table target directly — Rejected

It erases the distinction between what historically existed and what HOR-79 added, and
`migrate resolve` against a real legacy database would then lie about its contents.

### Convert all MyISAM tables to InnoDB in one wave — Rejected

Unbounded blast radius for a wave whose only requirement is enforceable FKs into
`users`. Later waves can convert the rest with their own gates.

### Deduplicate the association tables to enable composite PKs now — Rejected

Destroying or merging business rows requires an explicit, dedicated authorisation with
its own backup and review gates. Deferral loses nothing.

---

## Review Triggers

- A later wave converts more tables to InnoDB or migrates charsets — extend or
  supersede this ADR's deferral list.
- HOR-82 lands the `height` widening.
- Duplicate pairs in `storehorse_has_approvedby` / `studbook_has_storehorse` are
  resolved by an authorised cleanup, unblocking their composite primary keys.
- Prisma ships native engine/charset support in PSL, removing the need for hand-written
  migration SQL.
