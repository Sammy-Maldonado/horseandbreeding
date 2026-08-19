# ADR-014: `storehorse.status` Backfill, Deterministic Semantics, and Probe Retirement

**Status:** Accepted
**Date:** 2026-08-19
**Deciders:** Sammy Maldonado
**Supersedes:** [ADR-006](ADR-006-storehorse-column-compatibility-layer.md)

---

## Context

[ADR-006](ADR-006-storehorse-column-compatibility-layer.md) introduced a runtime
capability probe because `storehorse.status` existed in the application schema but not
in the `hbold` reference database. The probe suppressed the `status = 1` active-horse
filter where the column was absent, and applied it where the column existed.

HOR-79's migration `20260815092730_modernise_auth_foundation` then added the column to
the migrated rebuild path as `INTEGER NULL` — **with no backfill**. On a migrated legacy
restore, all **59,903** historical `storehorse` rows therefore held `NULL`. That flipped
ADR-006's probe into its "column exists" branch, so every core query applied
`WHERE status = 1` — and SQL three-valued logic never matches `NULL` against `1`.
The result was a total core-pipeline outage on the migrated database: `search`,
`search-pages` and the paginated filters returned zero horses, `pedigree-detail`
resolved nothing, and `mareline` failed with 500. Discovered during HOR-86 regression
validation; corrected under HOR-94.

This is precisely the state ADR-006 named in its review triggers: *"an approved
migration adds the column — prefer deleting this layer."*

### Reconstructed semantics — evidence, not inference from the literal

The meaning of `status` was reconstructed from every writer and reader in the
repository and from legacy behaviour, not inferred from the `status = 1` filter alone:

- **The legacy application had no horse-status concept.** Every historical horse was
  visible; `forsale` alone opted a horse into the marketplace. So every legacy row is,
  by the only definition the data ever had, an active horse.
- **Modern writers:** administrative horse creation writes `1`; the public sell form
  writes `-1` to create a marketplace listing.
- **Modern readers:** the pedigree pipeline filters `status = 1` (33 `where` sites,
  5 `select` sites, 11 endpoints); marketplace endpoints filter `status: -1,
  forsale: 1` directly, outside the compatibility layer.
- **No code path writes or interprets `0` or `NULL`,** and no deactivation flow exists.

The reconciled model is therefore:

| Value | Meaning |
|---|---|
| `1` | Active horse — the default, and the state of every legacy row |
| `-1` | Marketplace listing created by the public sell form |
| `NULL` | Not a valid state |

---

## Decision

1. **Backfill by a new, dedicated migration** —
   `prisma/migrations/20260819120000_storehorse_status_active_backfill/`:

   ```sql
   UPDATE `storehorse` SET `status` = 1 WHERE `status` IS NULL;
   ALTER TABLE `storehorse` MODIFY `status` INTEGER NOT NULL DEFAULT 1;
   ```

   The `UPDATE` runs **before** the `MODIFY`: removing nullability while `NULL` rows
   remain would fail in strict mode, or silently coerce `NULL` to `0` otherwise — and
   `0` has no meaning in this model. The applied HOR-79 migration is preserved exactly
   as history records it, and the faithful `0_init` baseline is untouched (ADR-012).

2. **Align the schema:** `prisma/schema.prisma` declares
   `status Int @default(1)`, keeping schema and migrated database in lockstep and the
   ADR-012 residual diff unchanged.

3. **Retire the runtime probe.** `server/utils/storehorse-compat.ts` remains the single
   owner of the active-status semantics, but its helpers are now unconditional:
   `ACTIVE_HORSE_STATUS`, `activeHorseFilter()`, `horseStatusSelect()`. The
   `information_schema` probe, its memoised cache, and the `supportsStatus` parameter
   threaded through the 11 consumer endpoints are deleted.

4. **Pin the contract with `hbold`-independent regression tests:**
   `prisma/storehorse-status-migration.test.ts` (migration history, ordering,
   touches-only-`status` guard, generated-schema agreement) and
   `server/utils/storehorse-compat.test.ts` (unconditional helpers, module-surface
   lock so a probe cannot quietly return).

---

## Rationale

- **Every legacy row is provably active** (target "legacy = active"). The alternative
  readings failed on evidence: safe deletion of the column is contradicted by live
  marketplace consumers writing and filtering `-1` (and forbidden by ADR-003); a mixed
  historical assignment is unprovable — no authoritative database with populated
  `status` values exists (HOR-32 remains blocked), and inventing a partition would be
  exactly the kind of assumption this project forbids.
- **The probe now guards a branch that describes no supported environment.** Since
  ADR-012, the only supported rebuild path is legacy restore → `migrate deploy`, and
  that path always produces the column. Keeping the probe would keep alive the failure
  class that caused this outage — a filter whose effect silently depends on database
  introspection.
- **`NOT NULL DEFAULT 1` makes the invalid state unrepresentable** instead of
  tolerated. A `NULL`-tolerant filter would have accepted the defect permanently.
- **One migration, one column, measured effect.** The backfill touches exactly one
  column, is idempotent in effect, and its row impact is verified by rehearsal on a
  disposable copy before it is applied to the reference database.

---

## Consequences

### Positive

- The core pedigree pipeline works on the migrated `hbold`: search, pagination,
  pedigree, maternal line and reports return the full historical dataset.
- One deterministic semantic model, owned in one file, pinned by offline tests.
- Endpoint code is simpler: no capability resolution, no threaded parameter.
- The defect class — behaviour silently switching on a runtime schema probe — is
  removed, not patched around.

### Negative / recorded defects out of this scope

- `1` and `-1` are **mutually exclusive partitions**: marketplace listings are
  invisible to the pedigree pipeline. Pre-existing behaviour, unchanged here.
- `edit-horse-by-id` omits `status` from its update guard, so an administrative edit
  of a marketplace listing silently flips `-1` to `1`. Recorded as a follow-up defect;
  fixing it here would exceed the issue scope.
- `pedigree` and `progeny` endpoints never filtered by `status` and still do not —
  a pre-existing inconsistency, recorded.
- Clients sending an explicit `status: null` to `add-full-horse-details` are now
  rejected by the database. Intended tightening: `NULL` is not a valid state.

---

## Alternatives Considered

### Keep the probe "just in case" — Rejected

The branch it guards no longer corresponds to any supported environment, and this
outage demonstrates the cost of behaviour that silently depends on introspection.
Dead flexibility is not safety.

### Make the filter NULL-tolerant (`status = 1 OR status IS NULL`) — Rejected

A permanent hack that encodes the defect into every query, leaves the column
semantically ambiguous forever, and diverges from what production-like databases
would return.

### Edit the applied HOR-79 migration in place — Rejected

An applied migration is history. Editing it desynchronises every database that already
recorded it as applied. Correction ships as a new migration.

### Backfill via an ad-hoc SQL patch under `db/patches/` — Rejected

ADR-012 makes Prisma Migrate the single versioned mechanism for schema evolution.
Patches exist for unmigrated bare restores, not for evolving the migrated state.

### Delete `status` and its filters (safe-deletion target) — Rejected

Contradicted by live marketplace writers and readers of `-1`, by the planned-future
classification of the marketplace feature set, and by ADR-003.

---

## Review Triggers

Revisit when:

- a confirmed current production database arrives (HOR-32) whose `status` values
  conflict with the backfilled model;
- the marketplace feature is redesigned and the `1`/`-1` partition changes;
- a horse-deactivation feature introduces states beyond `1` and `-1`.
