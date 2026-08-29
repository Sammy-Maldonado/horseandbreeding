# `hbold` Reference Database Baseline

**Status:** Active — reference baseline
**Scope:** The restored local `hbold` reference database and its relationship to the versioned Prisma schema
**Related:** [ADR-003](../adr/ADR-003-prisma-schema-preservation.md) · [ADR-002](../adr/ADR-002-mysql-mariadb-and-table-names.md) · [ADR-012](../adr/ADR-012-prisma-migrate-baseline-and-staged-innodb-modernisation.md) · [local-development.md](../runbooks/local-development.md)

> **Reading note (HOR-79).** Sections 2–5 describe the **legacy baseline** — a clean
> restore of `_legacy/hbold_backup.sql`. That description remains correct for the
> baseline and for `prisma/migrations/0_init/`. The **running local `hbold`**, however,
> now carries the versioned migration history on top of it — see §7 for the reconciled
> state and the measured residual drift.

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

What each of the eleven actually is — measured rather than assumed — is classified in
§3.5.

### 3.1 Interpretation — binding

Their absence is evidence that **`hbold` predates the application schema**. It is
**NOT** evidence that the models are obsolete, junk, or safe to delete.

Deleting them would silently remove working application capabilities.

Schema preservation is governed by
[ADR-003](../adr/ADR-003-prisma-schema-preservation.md). Any removal requires confirmed
evidence, a dedicated Linear issue, explicit acceptance criteria, tests, and an approved
migration and rollback plan.

### 3.2 Column-level drift

Beyond whole missing models, four models present in both places differ at column level.
Measured by introspecting the live local database and comparing against the committed
schema.

| Model | Columns declared in code, absent from `hbold` |
|---|---|
| **`storehorse`** | `status`, `currency`, `age`, `ad_title`, `created_at`, `seller_id` |
| `gallery` | `gallery_id`, `status` |
| `diciplinevalues` | `group_priority` |
| `users_has_storehorse` | `area_id` |

`hbold` holds exactly **31** `storehorse` columns, from `horse_id` through
`mareline_id`.

The six `storehorse` columns are a coherent **marketplace feature set** — advertisement
title, currency, seller, and a publication `status` — built in application code and
never shipped to this dataset. `seller_id` points at the `sellers` model, itself one of
the eleven code-only models listed above. `git log -S` places `status Int?` in the
initial repository baseline commit, so it arrived with the adopted application.

`storehorse.status` is the only drifted column that breaks a user-facing path: the
application filters `status = 1` to mean "active horse" across the pedigree pipeline.
The original runtime compatibility strategy is recorded in
[ADR-006](../adr/ADR-006-storehorse-column-compatibility-layer.md); it applied to the
**unmigrated baseline only**. On the migrated `hbold` the column exists, and its state
went through two phases: HOR-79 added it as `INTEGER NULL` with no backfill — which
left all 59,903 legacy rows `NULL` and emptied every `status = 1` query — and HOR-94
backfilled it and hardened it to `NOT NULL DEFAULT 1` with defined semantics
(`1` active, `-1` marketplace listing). See §7 and
[ADR-014](../adr/ADR-014-storehorse-status-backfill-and-probe-retirement.md), which
supersedes ADR-006.

The remaining drifted columns affect marketplace endpoints only and are tracked
separately.

### 3.3 Capacity drift — columns present but too narrow

Drift is not only about columns that are missing. A column can exist in `hbold` and still
be the wrong shape, because the restore source `_legacy/hbold_backup.sql` carries the
legacy PHP application's definitions.

| Model.column | `hbold` as restored | Declared by the repository | Effect |
|---|---|---|---|
| `users.password` | `varchar(50)` | `varchar(100)` — in `prisma/schema.prisma` **and** `prisma/migrations-archive/20241010194110_y/migration.sql` | A 60-character bcrypt digest does not fit; **every registration failed** (HOR-74) |
| `storehorse.height` | `varchar(4)` | `varchar(12)` — in `prisma/schema.prisma` **and** the same archived migration, which declares `varchar(4)` for `storehorse_new` in the same file | Every height option `pages/sell.vue` offers is 10–11 characters; **no height choice on that form could be stored** (HOR-82) |

This is a different class from §3.2 and takes the opposite response. Where a column is
**absent**, the target shape is unknown and the answer is a runtime compatibility layer
([ADR-006](../adr/ADR-006-storehorse-column-compatibility-layer.md)). Where a column is
**present but too narrow**, the repository already declares the correct shape, so the
reference database is reconciled with the declared width. The classification rule and its
five conditions are
[ADR-011](../adr/ADR-011-database-capacity-drift-reconciliation.md).

**The mechanism changed with the migration baseline.** ADR-011 prescribed idempotent
patches under [`db/patches/`](../../db/patches/) because at the time no migration chain
existed. Since HOR-79,
[ADR-012](../adr/ADR-012-prisma-migrate-baseline-and-staged-innodb-modernisation.md)
§Decision 1 makes Prisma Migrate the single versioned mechanism for schema evolution.
ADR-011's *classification* still governs the decision; ADR-012 owns *how* it is applied.

- `users.password` predates the baseline. Its patch
  [`db/patches/001-HOR-74-users-password-varchar100.sql`](../../db/patches/001-HOR-74-users-password-varchar100.sql)
  is still required after a bare legacy restore that is not migrated — see
  [local-development.md](../runbooks/local-development.md) §5.1 — and is redundant after a
  migrated rebuild (§7).
- `storehorse.height` was reconciled under HOR-82 by the formal migration
  `prisma/migrations/20260815161716_storehorse_height_varchar12`, **not** by a new patch.
  It is capacity-only: `MODIFY` preserves the column name, ordinal position 7, `NOT NULL`,
  the `'0'` default, `latin1`/`latin1_swedish_ci` and the MyISAM engine. `storehorse_new`
  stays at `varchar(4)`. Measured on 59,903 rows before the change: 0 rows longer than 4
  characters, so widening provably could not rewrite a stored value — confirmed by
  identical row-count, length-distribution and CRC32 fingerprints before and after.

`0_init` still declares `varchar(4)`. That is what the pre-Migrate database actually
contained, and the baseline records history rather than correcting it.

The comparison has only been made where a failure pointed at it, so this table is **not**
a complete inventory.

### 3.4 Introspection safety

Never run `prisma db pull` against the versioned schema — it rewrites the file in place
and would drop the eleven code-only models. Use:

```bash
pnpm exec prisma db pull --print
```

or point `--schema` at a throwaway file containing only `generator` and `datasource`
blocks.

### 3.5 Model intent classification

§3.1 rules that the eleven code-only models are not obsolete. This section records what
each one **is**, so that a future migration author never has to guess. Measured under
HOR-81.

#### The decisive evidence

`prisma/migrations/20241010194110_y/migration.sql` is **never applied in any known
environment** and is **not executable** — it emits `DEFAULT ()`, which is not valid SQL,
and it carries no `ENGINE=` clause anywhere, so it would silently create the whole
database as InnoDB/utf8mb4. It is nevertheless dated, in-repo, authored **intent**, and
that is what makes it evidence.

It creates **40 tables and 27 foreign keys**. Its table order is the signature of models
hand-added to the Prisma schema *after* the legacy database was introspected:

```txt
positions  1–17   legacy tables, approvedby … storehorse
position   18     areas                       <- inserted
positions 19–30   legacy tables, storehorse_has_approvedby … videos
positions 31–40   vendor, clients, authorization_codes, access_tokens,
                  refresh_tokens, scopes, user_roles, horse_views,
                  sellers, user_role_scope    <- appended
```

The previous developer therefore **deliberately designed every one of the eleven**,
wrote the SQL to create them, and never ran it. None of them is an accident, and none
of them is abandoned residue.

#### Classification

| Model | Class | Evidence |
|---|---|---|
| `access_tokens` | **ACTIVE** | `login.post.ts:48`, `refresh-token.post.ts:50` — written and never read; see the closing note below |
| `refresh_tokens` | **ACTIVE** | `login.post.ts:60`, `refresh-token.post.ts:14` (read and write) |
| `scopes` | **ACTIVE** | `sign-up.post.ts:79`, `user-info.post.ts:62,69` (a third citation, `user.post.ts`, was removed by HOR-98) |
| `user_roles` | **ACTIVE** | `sign-up.post.ts:69`, `user-info.post.ts:77`, `middleware/auth.ts:18` (a fourth citation, `user.post.ts`, was removed by HOR-98) |
| `user_role_scope` | **ACTIVE** | `sign-up.post.ts:89` (a second citation, `user.post.ts`, was removed by HOR-98) |
| `areas` | **ACTIVE** | `server/api/areas.post.ts:11`, consumed by `pages/sell.vue:415`; public in `apiAccessPolicy.ts:54`; FK target of `users_has_storehorse.area_id` |
| `vendor` | **ACTIVE** | `server/api/vendor.post.ts:11`, consumed by `pages/vendor.vue:163`; public in `apiAccessPolicy.ts:48`; listed as an anonymous submission form in [ADR-007](../adr/ADR-007-api-authentication-trust-boundary.md) |
| `clients` | **PARTIALLY IMPLEMENTED** | Designed as the OAuth client registry; FK target of all three token tables. No server consumer exists |
| `authorization_codes` | **PARTIALLY IMPLEMENTED** | Designed as OAuth authorization-code storage. Its only consumer, `pages/callback.vue`, called an endpoint that never existed and was removed by HOR-98; like `clients`, the model now has no consumer |
| `sellers` | **PLANNED-FUTURE** | Designed with a `users` FK and referenced by `storehorse.seller_id`; carries hand-written developer comments in `schema.prisma`; no consumer |
| `horse_views` | **PLANNED-FUTURE** | Designed with a `storehorse` FK and a hand-written comment; no consumer |

No model is classified OBSOLETE. No model is classified UNKNOWN.

Two models flagged elsewhere as cleanup candidates, `marcustest` and `storehorse_new`,
are **not** part of this set — both exist in `_legacy/hbold_backup.sql` and therefore in
the baseline. They remain governed by
[existing-assets.md](../architecture/existing-assets.md) §6.

#### The drifted columns are part of the same plan

§3.2 lists `storehorse.seller_id` and `users_has_storehorse.area_id` as declared in code
and absent from `hbold`. They are absent for the same reason the models are: the
historical migration introduces **both the columns and their foreign keys** —
`storehorse.seller_id → sellers.id` and `users_has_storehorse.area_id → areas.id`. They
are planned columns, not lost legacy columns, and a modernisation migration must treat
the column and its target table as one unit.

#### Runtime consequence — open finding

`areas` and `vendor` are **live, public, unauthenticated endpoints querying tables that
exist in no environment**. Measured directly against the local reference database with
Prisma 6.19.3:

| Call | Result |
|---|---|
| `prisma.areas.findMany(...)` | `P2021` — table does not exist |
| `prisma.vendor.findMany(...)` | `P2021` — table does not exist |
| `prisma.sellers.findMany(...)` | `P2021` — table does not exist |
| `prisma.horse_views.findMany(...)` | `P2021` — table does not exist |
| `prisma.clients.findMany(...)` | `P2021` — table does not exist |

Both endpoints swallow the error in a generic `catch` and return **HTTP 200** carrying an
error code inside the JSON body — `statusCode: 400` for `areas`, `status: 500` for
`vendor`. The county dropdown in `pages/sell.vue` therefore fails silently rather than
reporting a fault. This is the behaviour §7 of `CLAUDE.md` prohibits, and it predates
this audit; it is recorded here, not fixed here.

> **Partially resolved 2026-08-22 (HOR-96):** the *transport* half of this finding is
> closed. Both handlers now `throw createError(...)`, so a failed call answers with a real
> HTTP status instead of `200` — `areas` answers `400` when no county is supplied and `500`
> when the table is missing, `vendor` answers `500`. **The rest of this finding stands.**
> The tables are untouched: `areas` and `vendor` still query tables that exist in no
> environment, so the calls still fail. And the county dropdown still fails *silently* —
> `fetchAreas` in `pages/sell.vue` goes through `fetchDataMethodPost`, which uses native
> `fetch` and so does not reject on a `4xx`/`5xx`; it reads `statusCode` off the parsed
> body and simply leaves `areas` empty. What changed is that the failure is now visible to
> every layer above the handler — a proxy, a probe or an error tracker can see it. Making
> the dropdown *report* the fault is a separate frontend change. The classification above
> is preserved as the audit's historical finding.

`sellers`, `horse_views`, `clients` and `authorization_codes` have no consumer, so their
absence produces no runtime failure today.

#### Binding consequence for the migration history

Because all eleven are ACTIVE, PARTIALLY IMPLEMENTED, or PLANNED-FUTURE, the
modernisation migration history **creates all eleven**. None is dropped, and none is
created merely because it appears in an old schema — each is created because the evidence
above says it was intended.

`access_tokens` is the single exception in shape, not in existence: it is written and
never read, so its **persistence design** is superseded by the modern authentication
work. The model's fate is decided by that work, not by this audit.

> **Resolved 2026-08-15 (HOR-76):** the modern authentication work decided the fate of
> `access_tokens` — access tokens are now stateless JWTs that are never persisted, and
> the table was dropped under the safe-deletion gate by migration
> `20260815101514_modern_auth_sessions`. The same migration removed
> `refresh_tokens.client_id`; refresh sessions are user-scoped and store only a SHA-256
> digest. See [ADR-013](../adr/ADR-013-modern-authentication-architecture.md). The
> classification above is preserved as the audit's historical finding.

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

Last verification pass: 2026-08-14, against the running local `hb-mysql` container.

| Item | Status |
|---|---|
| Prisma model count (41) | **Verified** — counted `model` declarations in `prisma/schema.prisma` |
| `hbold` table count (30) | **Verified** — 2026-08-14, by restoring `_legacy/hbold_backup.sql` into a disposable database. The figure describes a **clean restore**. The running local `hbold` may hold more, because provisional `db/patches/` work adds tables to it; always measure the baseline from a clean restore, never from the running copy |
| The eleven code-only model names | **Verified** — live introspection |
| `storehorse` count of 59,903 | **Verified** — 2026-08-14, live read-only `COUNT(*)` |
| Column-level drift table (§3.2) | **Verified** — live introspection compared against the committed schema |
| Model intent classification (§3.5) | **Verified** — 2026-08-14, against `prisma/migrations/20241010194110_y/migration.sql`, the committed schema, and a repository-wide consumer sweep |
| `P2021` runtime results (§3.5) | **Verified** — 2026-08-14, read-only Prisma probe against the live local database |
| Business-domain evidence in `_legacy/` (§3.5) | **Searched, nothing found** — no PHP-era reference to `sellers`, `horse_views`, `authorization_codes` or OAuth. Classification rests on the migration and the current codebase, not on the legacy site |
| Git provenance of the eleven models | **No discrimination available** — every `git log -S` search resolves to the initial baseline commit, so history cannot date them relative to one another |
| `users.password` capacity drift (§3.3) | **Verified** — 2026-08-14, live introspection before and after the HOR-74 patch |
| Completeness of the capacity-drift table (§3.3) | **Not established** — only the one column that caused a failure was compared |
| `competition_history` and `remarks` figures | **Not revalidated** — carried forward from earlier analysis |

Read-only verification is described in
[local-development.md](../runbooks/local-development.md). It does not require, and must
not trigger, another restore.

---

## 7. HOR-79 reconciliation — `hbold` carries the migration history

Reconciled 2026-08-15 under HOR-79, governed by
[ADR-012](../adr/ADR-012-prisma-migrate-baseline-and-staged-innodb-modernisation.md).
The full pre-reconciliation copy (35 tables including patch/test pollution, 670 `users`
rows) was backed up and restore-verified before the rebuild.

Procedure: drop/recreate → clean restore of `_legacy/hbold_backup.sql` →
`prisma migrate resolve --applied 0_init` → `prisma migrate deploy`. The result is
structurally identical to a `migrate deploy` against an empty database (verified by
byte-identical structure signatures).

Measured state of the reconciled `hbold`:

| Item | Value |
|---|---|
| Base tables | **42** — 30 legacy + 11 code-only models + `_prisma_migrations` |
| `users` | InnoDB, 661 rows (ids 1–728), content fingerprint identical before/after |
| `users.password` | `varchar(100)` — via versioned migration; the HOR-74 patch `db/patches/001` is **no longer required after a migrated rebuild** (it remains required for a bare legacy restore that is not migrated) |
| `storehorse` | 59,903 rows; MyISAM, `latin1`; `height` reconciled to `varchar(12)` under HOR-82 (§3.3), content fingerprint identical before/after |
| `storehorse.status` | `INTEGER NOT NULL DEFAULT 1` — HOR-79 added it as `INTEGER NULL` with no backfill (all 59,903 legacy rows `NULL`, emptying every `status = 1` query); HOR-94's migration `20260819120000_storehorse_status_active_backfill` backfilled `NULL → 1` and removed nullability. Semantics: `1` active, `-1` marketplace listing ([ADR-014](../adr/ADR-014-storehorse-status-backfill-and-probe-retirement.md)) |
| The eleven code-only models (§3.5) | **All created** — InnoDB, `utf8mb4`, with 10 enforced foreign keys |

Consequences for earlier sections:

- **§3 / §3.2 drift tables** describe the *baseline versus schema* relationship. On the
  migrated `hbold` the listed models and columns now exist; on a clean unmigrated
  restore the tables remain accurate.
- **§3.5 runtime consequence**: `P2021` no longer reproduces on the migrated `hbold` —
  the tables exist (empty). The swallowed-error behaviour of `areas`/`vendor` endpoints
  is a code defect and remains open.

### 7.1 Residual drift — deliberate, bounded, measured

After the full migration chain, `prisma migrate diff` between the database and
`prisma/schema.prisma` reports **exactly 23 statements**, all deferred with evidence
(see ADR-012 and, for the HOR-9 additions, §7.2):

| Deferral | Count | Blocker |
|---|---|---|
| Foreign keys touching MyISAM tables — declared before HOR-9 | 17 | MyISAM cannot enforce them; 2 would hard-fail (InnoDB child → MyISAM parent) |
| Foreign keys from the HOR-9 InnoDB tables to `storehorse` | 4 | `canonical_writeup.horse_id`, `source_assertion.horse_id`, `source_assertion.related_horse_id`, `canonical_change_audit.horse_id` — InnoDB child → MyISAM parent hard-fails (errno 150); the application enforces them until `storehorse` moves to InnoDB in a later ADR-012 wave |
| Composite primary keys | 2 | `storehorse_has_approvedby` (52 duplicate pairs), `studbook_has_storehorse` (16,696 duplicate pairs) — deduplication is an unauthorised destructive decision |

The count was **20** until HOR-82 landed the `storehorse.height` widening (§3.3), which
removed the one remaining capacity statement; **19** from HOR-82 until HOR-9; and **23**
since HOR-9 declared four relations towards `storehorse` (§7.2). The categories above are
structural and are not resolved by widening a column.

Anything outside this list appearing in the residual diff is a defect, not an accepted
drift.

### 7.2 HOR-9 — canonical relational model around `storehorse`

Measured 2026-08-29 on the local `hbold` before and after
`20260829194803_hor9_canonical_relational_model` (model reference:
[canonical-relational-model.md](canonical-relational-model.md)):

| Item | Before | After |
|---|---|---|
| Base tables (`information_schema.tables`) | 41 | 46 |
| Columns | 303 | 392 |
| `_prisma_migrations` rows | 6 | 7 |
| `storehorse` rows | 59,903 | 59,903 |
| `competition_history` rows | 454 | 454 |
| Rows deleted / tables dropped / columns dropped | — | 0 / none / none |

New tables — `source_document`, `ingestion_run`, `canonical_writeup`, `source_assertion`,
`canonical_change_audit` — are InnoDB, `utf8mb4_unicode_ci`, created empty, with ten
enforced foreign keys among InnoDB tables. `competition_history` gained nine nullable
columns; every one of the 454 legacy rows keeps them `NULL`. Its free-text additions are
declared `utf8mb4` explicitly inside the `latin1` table; Prisma reports no charset drift.

The §7 figure of **42** base tables predates the `access_tokens` drop in
`20260815101514_modern_auth_sessions` (HOR-76): 41 before HOR-9 is consistent with it.
