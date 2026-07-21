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
| [ADR-006](ADR-006-storehorse-column-compatibility-layer.md) | Compatibility layer for drifted `storehorse` columns | Accepted |

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

- [../requirements/automation-mvp.md](../requirements/automation-mvp.md) — stable functional requirements
- [../architecture/existing-assets.md](../architecture/existing-assets.md) — reusable technical inventory
- [../data/hbold-baseline.md](../data/hbold-baseline.md) — reference database baseline
- [../domain/writeup-grammar.md](../domain/writeup-grammar.md) — historical write-up grammar
