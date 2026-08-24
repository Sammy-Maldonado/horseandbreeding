# ADR-016: MariaDB 12.3 LTS via side-by-side container migration with verified restore

**Status:** Accepted
**Date:** 2026-08-24
**Deciders:** Sammy Maldonado

---

## Context

The reference database `hbold` runs on **MariaDB 10.11 LTS** in the local Docker
container `hb-mysql` (image `mariadb:10.11`). The 10.11 line is maintained until
**2028-02-16**; the dependency policy requires moving to a current LTS line before the
end-of-life horizon forces a rushed upgrade. The policy is **LTS-first and
documentation-first**: candidate lines are researched through current official
documentation (Context7 plus the official MariaDB release and lifecycle sources) before
any package or container transaction, and prereleases and rolling lines are not
adoption targets.

The verified lifecycle picture at decision time:

| Line | Kind | GA | Maintained until |
|---|---|---|---|
| 10.11 (current) | LTS | 2023-02-16 | 2028-02-16 |
| 11.4 | LTS | 2024-05-29 | 2029-05-29 |
| 11.8 | LTS | 2025-06-04 | 2028-06-04 |
| 12.3 | LTS | 2026-05-28 | 2029-06-12 |
| 13.x | Rolling | — | Not an LTS commitment |

Constraints that bind this decision:

- **`hb-mysql` stores its data directory on an anonymous Docker volume.** Starting a
  newer MariaDB image over that volume triggers an in-place system-table upgrade
  (`mariadb-upgrade`, or `MARIADB_AUTO_UPGRADE` in the official image). MariaDB does
  **not support downgrading** a data directory once its system tables are upgraded —
  an in-place path would destroy the only live rollback source.
- Official MariaDB documentation supports **direct upgrades that skip intermediate
  versions** for standalone servers, provided a backup exists and the shutdown is
  clean. The version-specific upgrade guides covering 10.11 → 11.4 → 11.8 → 12.3 were
  reviewed pairwise for breaking changes.
- Since 11.8 the **server-level default character set is `utf8mb4`** (MDEV-19123) with
  modern `uca1400` default collations (MDEV-25829). `hbold` is a `latin1`-default
  database in which every table declares its charset explicitly (a `latin1` majority
  with a `utf8mb4` minority), so table and column semantics are shielded from server
  defaults — but the database-level default itself must be preserved deliberately.
- **Prisma 7 with `@prisma/adapter-mariadb`** (ADR-015) documents support for MariaDB
  10.0+ with no upper server bound, and the `mariadb` driver's feature floors all sit
  below 10.11. No Prisma-side change is expected or authorised.
- **ADR-012 invariants**: `0_init` is an immutable, faithful baseline; the migration
  history must converge on a fresh environment; the residual `prisma migrate diff`
  remains exactly the 19 deferred DDL statements. ADR-003 (schema preservation) stays
  binding.

Exact patch releases within a line are owned by the container configuration and the
lockstep of the official image tag — durable documents reference the **line**, never a
transient patch number.

---

## Decision

1. **Target line.** Adopt **MariaDB 12.3 LTS** as the server line for the local
   reference environment. The runbook's container image is the series tag
   **`mariadb:12.3`**, which tracks the newest maintained patch of the line; the
   running container and its image digest are the authority on the exact patch.
2. **Migration strategy: side-by-side, never in-place.** The 12.3 environment is a
   **new container with a new, explicitly named Docker volume**, populated by
   restoring a **fresh, checksum-verified logical dump** of the current `hbold` taken
   with the database-level default charset included. The existing `hb-mysql`
   container and its anonymous volume are never started under a newer image, never
   recreated, and never deleted as part of this migration.
3. **Rollback source.** The untouched 10.11 container remains the primary rollback
   source until the cutover is proven — and it is **retained after cutover**; its
   removal is a separate, explicit decision. The verified dump is the second rollback
   layer.
4. **Cutover requirements.** Cutover to 12.3 as the canonical local environment is
   permitted only when all of the following are green on a disposable 12.3
   environment: verified backup with proven restore; restored-current database passes
   `prisma migrate status` as up to date; a separate environment rebuilt from the
   clean legacy baseline plus the full migration history converges; the
   before/after invariant matrix (tables, engines, charsets, collations, columns,
   indexes, foreign keys, row counts and content checksums) shows no unexplained
   mismatch; database and table charsets are preserved; SQL mode and transaction
   semantics are unchanged; Prisma 7 validate/generate/status and runtime queries
   pass; the residual migrate diff is exactly the 19 deferred statements; existing
   migration files are byte-identical; the full test suite and production build pass;
   and the core product flows return identical results on both server lines.
5. **Cutover mechanics.** The cutover itself is reversible: the old container is
   stopped and renamed (never deleted), and the new 12.3 container takes the
   canonical name and port with its named volume and restored data. Post-cutover
   verification includes `SELECT VERSION()` **through the application path**, not
   container-name inference.
6. **Rollback procedure.** Stop the 12.3 container, restore the original name of the
   preserved 10.11 container, start it — its volume is untouched by design. No data
   written only to the 12.3 environment survives rollback; the migration window
   therefore stays free of meaningful writes.
7. **Scope boundary.** No schema redesign, no data transformation, no charset
   homogenisation, no MyISAM→InnoDB modernisation (staged separately under ADR-012),
   no Prisma change, no credential rotation, and no production-hosting decision are
   part of this migration.

---

## Rationale

- **12.3 over 11.4:** 11.4 is two feature generations older and its maintenance
  window ends earlier than 12.3's. Adopting it would spend a full migration effort to
  land on an already-ageing line with no support-time gain.
- **12.3 over 11.8:** 11.8 has the shortest runway of the candidates — it reaches
  end of life before 11.4 does, despite being newer. It also carries the same
  utf8mb4-default breaking change as 12.3, so it is not even a lower-risk stepping
  stone.
- **13.x excluded:** rolling releases carry no LTS maintenance commitment and are
  outside the adoption policy.
- **Side-by-side over in-place:** the anonymous volume makes in-place upgrade
  irreversible (no supported downgrade), while a new container with a named volume
  keeps the working 10.11 environment intact as a live rollback and makes the volume
  lifecycle explicit and auditable from now on.
- **Logical dump over data-directory copy:** the dump restores cleanly across a
  three-line version jump, carries the database-level default charset explicitly, and
  doubles as the verified backup the migration must have anyway.

---

## Consequences

### Positive

- The local environment lands on the newest LTS line with support until mid-2029.
- The data directory moves from an anonymous volume to an explicitly named one.
- The migration produces a fresh, restore-proven backup of the reference database.
- Rollback is a container stop/rename, not a restore under pressure.

### Negative

- Two MariaDB containers coexist on the machine until the retention decision, using
  disk for both volumes plus the dump.
- A database created on the new line without an explicit charset defaults to
  `utf8mb4`/`uca1400` — environment rebuilds must restore the dump (which carries the
  `latin1` database default) rather than relying on server defaults.
- The stricter 11.8+ InnoDB conflict detection and the newer optimizer cost model are
  behaviour changes that regression gates must cover on every future line jump too.

---

## Alternatives Considered

### In-place upgrade of `hb-mysql` (new image over the existing volume) — Rejected

Irreversible: MariaDB does not support downgrades after the system tables are
upgraded, and the anonymous volume is the only live copy of the environment.

### MariaDB 11.4 LTS — Rejected

Older feature line, earlier end of maintenance than 12.3, no compensating benefit.

### MariaDB 11.8 LTS — Rejected

Shortest support runway of the candidate lines while carrying the same charset-default
breaking change as 12.3.

### 13.x rolling — Rejected

No LTS commitment; outside the adoption policy.

### Stay on 10.11 — Rejected

Defers a mandatory move toward a 2028 end-of-life wall and contradicts the
modernisation mandate.

---

## Review Triggers

- The 12.3 line approaches end of maintenance, or a newer LTS line becomes the
  adoption target.
- `@prisma/adapter-mariadb` or the `mariadb` driver declares a MariaDB server version
  constraint.
- A MyISAM→InnoDB modernisation wave (ADR-012) lands and revisits engine-dependent
  behaviour on 12.3.
- The retention decision for the preserved 10.11 environment is taken.
- A production hosting decision selects a managed database whose line differs from
  the local one.
