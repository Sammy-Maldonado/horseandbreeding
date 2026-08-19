# Architecture Decision Records

Accepted ADRs are **binding until superseded**.

The official ADR location is `docs/adr/`.

## Index

| ADR | Decision | Status |
|---|---|---|
| [ADR-001](ADR-001-adopt-existing-nuxt-application.md) | Adopt and modernise the existing Nuxt application; do not rewrite from scratch | Accepted |
| [ADR-002](ADR-002-mysql-mariadb-and-table-names.md) | Keep MySQL/MariaDB and the existing useful table names | Accepted |
| [ADR-003](ADR-003-prisma-schema-preservation.md) | Preserve the Prisma schema when working against legacy `hbold` | Accepted |
| [ADR-004](ADR-004-pnpm-package-manager.md) | pnpm is the official package manager | Accepted |
| [ADR-005](ADR-005-canonical-writeup-library.md) | Canonical mare write-up library fed by Word extraction | Accepted |
| [ADR-006](ADR-006-storehorse-column-compatibility-layer.md) | Compatibility layer for drifted `storehorse` columns | Superseded by ADR-014 |
| [ADR-007](ADR-007-api-authentication-trust-boundary.md) | API authentication trust boundary and per-route access classification | Accepted |
| [ADR-008](ADR-008-flat-repository-structure-during-framework-majors.md) | Keep the flat repository structure during framework majors | Accepted |
| [ADR-009](ADR-009-tailwind-vite-plugin-and-v3-compatibility-layer.md) | Integrate Tailwind CSS through its official Vite plugin, and hold the Tailwind 3 appearance behind a temporary compatibility layer | Accepted — reviewed 2026-08-13; the layer is withdrawn and the appearance is Tailwind 4 native |
| [ADR-010](ADR-010-server-side-payment-amount-authority.md) | The server owns the payment amount, and the Stripe API version is pinned | Accepted |
| [ADR-011](ADR-011-database-capacity-drift-reconciliation.md) | Reconcile capacity drift in `hbold` with versioned SQL patches, distinct from the presence drift ADR-006 governs | Accepted |
| [ADR-012](ADR-012-prisma-migrate-baseline-and-staged-innodb-modernisation.md) | Version schema evolution with a faithful Prisma Migrate baseline and modernise engines in staged InnoDB waves | Accepted |
| [ADR-013](ADR-013-modern-authentication-architecture.md) | Stateless short-lived access JWTs and rotating digest-only refresh sessions; drop the write-only `access_tokens` store | Accepted |
| [ADR-014](ADR-014-storehorse-status-backfill-and-probe-retirement.md) | Backfill `storehorse.status` to `NOT NULL DEFAULT 1`, fix the reconciled `1`/`-1` semantics, and retire the ADR-006 runtime probe | Accepted |

## Writing a new ADR

Copy [ADR-template.md](ADR-template.md) and number it sequentially.

Create an ADR when a decision:

- changes architecture or data ownership;
- introduces or replaces a major technology;
- changes a durable domain invariant;
- creates a migration or compatibility strategy;
- has meaningful alternatives and consequences;
- must remain understandable months later.

Do not create an ADR for routine implementation details.

An ADR is never edited to change a past decision. Supersede it with a new ADR and update
the status of the old one.

## Related documents

- [../../db/patches/README.md](../../db/patches/README.md) — reference-database compatibility patches
- [../requirements/automation-mvp.md](../requirements/automation-mvp.md) — stable functional requirements
- [../architecture/existing-assets.md](../architecture/existing-assets.md) — reusable technical inventory
- [../data/hbold-baseline.md](../data/hbold-baseline.md) — reference database baseline
- [../domain/writeup-grammar.md](../domain/writeup-grammar.md) — historical write-up grammar
