# ADR-006: Compatibility Layer for Drifted `storehorse` Columns

**Status:** Accepted
**Date:** 2026-07-21
**Deciders:** Sammy Maldonado

---

## Context

The application schema declares columns on `storehorse` that the local `hbold`
reference database has never contained. Measured drift, verified by introspecting the
live local database against the committed schema:

| Model | Columns declared in code, absent from `hbold` |
|---|---|
| `storehorse` | `status`, `currency`, `age`, `ad_title`, `created_at`, `seller_id` |
| `gallery` | `gallery_id`, `status` |
| `diciplinevalues` | `group_priority` |
| `users_has_storehorse` | `area_id` |

`hbold` holds exactly 31 `storehorse` columns, from `horse_id` through `mareline_id`.

### Root cause

These six `storehorse` columns are not a lost migration and are not evidence that a
newer database exists. They are a **coherent marketplace feature set** — advertisement
title, currency, seller, and a publication `status` — that the previous developer built
in application code and never shipped to this dataset. The reading is corroborated
structurally: `seller_id` points at the `sellers` model, which is itself one of the
eleven models that exist in code and not in `hbold`, alongside `clients`, `vendor`,
`areas`, and `horse_views`.

`git log -S` confirms `status Int?` arrived in the initial repository baseline commit.
It came with the adopted application; nobody added it afterwards.

### Why it broke a user-facing feature

`storehorse.status` is not merely declared — it is **used as a filter**. The application
treats `status = 1` as "this horse is active" and applies it across the pedigree
pipeline: **33 `where` sites and 5 `select` sites across 11 endpoints**, including
`search`, `mareline`, `family-tree-of-horse-by-id`, `pedigree-detail`,
`report-horses-ids`, and the paginated filters.

Every one of those queries fails against `hbold` with:

```txt
The column hbold.storehorse.status does not exist in the current database
```

This is the first drift instance that breaks behaviour rather than sitting dormant, and
it blocks the core pedigree pipeline the Automation MVP depends on.

---

## Decision

Introduce a **narrow, explicit compatibility layer** at
`server/utils/storehorse-compat.ts` and route every `storehorse` `status` usage through
it.

The layer provides:

- `activeHorseFilter(supportsStatus)` — returns `{ status: 1 }` where the column exists,
  and `{}` where it does not. Spread into a `where` clause, it contributes nothing when
  unsupported rather than narrowing the result set.
- `horseStatusSelect(supportsStatus)` — the same idea for a `select` projection.
- `detectStorehorseStatusColumn(client)` — probes `information_schema` for the column.
- `storehorseSupportsStatus(client)` — memoised per process, so the probe runs once and
  concurrent callers share a single query.

Rules:

- The capability is resolved **once per request** and threaded through recursive
  select-builders and ancestor-walkers as an explicit parameter. No module-level mutable
  state, no probe inside a recursive function.
- Probe failures **propagate**. A failed probe means the database is unreachable;
  guessing would silently leave every query unfiltered.
- `prisma/schema.prisma` is **not** modified. The `status` field stays.
- The `status` column is **not** added to `hbold`.

### Explicitly out of scope

The remaining drifted columns — `currency`, `age`, `ad_title`, `created_at`,
`seller_id`, and the three non-`storehorse` models — are **not** covered by this layer.
They are used only by marketplace endpoints (`storeHorseById`, `addHorse`) that sit
outside the Automation MVP pedigree path. They get their own issue rather than being
bundled here.

---

## Rationale

- Preserves the application schema, per
  [ADR-003](ADR-003-prisma-schema-preservation.md). Absence from `hbold` is drift, not
  obsolescence.
- Avoids patching the database to fit the code, which would hide the drift and let the
  same defect class resurface on the next missing column.
- Keeps the semantic difference visible and reversible: the filter is *suppressed*
  where unsupported, not deleted. Connect a database that has the column and the
  application immediately resumes filtering by it, with no code change.
- Runtime detection means correctness does not depend on remembering to flip a flag when
  the database changes.
- The fragments are pure functions, so the behaviour is unit-testable without a database.

---

## Consequences

### Positive

- The pedigree pipeline runs against `hbold`, unblocking local development and HOR-4.
- One place to look, and one place to delete, when a database with the column arrives.
- Drift is documented and measured rather than discovered per incident.
- Behaviour against a newer database is unchanged.

### Negative

- Against `hbold`, queries return **all** horses rather than only active ones. There is
  no way to honour a filter on a column that does not exist, so results locally are a
  superset of what production would return. This must be remembered when interpreting
  local data.
- One extra `information_schema` query per process.
- Call sites carry an explicit parameter, which is more verbose than a bare literal.
- The compatibility layer is debt. It should be deleted, not extended, once the database
  question is settled.

---

## Alternatives Considered

### Delete `status` from `prisma/schema.prisma` — Rejected

Forbidden by [ADR-003](ADR-003-prisma-schema-preservation.md). It would discard a field
the application legitimately uses and silently break the marketplace feature against any
database that does have the column.

### Add the column to local `hbold` — Rejected

Patches data to fit code. It hides the drift instead of explaining it, invents schema
without evidence that it matches any real database, and guarantees the same class of
defect reappears on the next missing column.

### Remove the `status: 1` filters outright — Rejected

Simplest diff, worst outcome: it silently changes behaviour against every database,
including a future one that has the column, turning a compatibility problem into a
permanent semantic regression.

### A Prisma client extension that strips `status` from every query — Rejected

A single choke point is attractive, but each endpoint constructs its own `PrismaClient`,
so it would require introducing a shared client — a broader refactor than this issue
authorises. It also makes the behaviour implicit and harder to trace, and this project
prefers explicit over magic.

### An environment flag instead of runtime detection — Rejected

Correctness would depend on a human remembering to set it correctly per environment.
Detection cannot be forgotten.

---

## Review Triggers

Revisit — and prefer deleting this layer — when:

- a confirmed current database containing `storehorse.status` is provided (HOR-32);
- a schema RFC decides the authoritative shape of `storehorse` (HOR-7);
- an approved migration adds the column to the working dataset;
- the drift inventory changes materially, or another drifted column starts breaking a
  user-facing path.
