# Migrations archive

Historical evidence only. Nothing in this directory is part of the active
Prisma Migrate chain in `prisma/migrations/`, and nothing here may be executed.

## `20241010194110_y`

The single migration the previous developer generated (October 2024). It was
never recorded as applied anywhere: no `_prisma_migrations` table existed in
any environment before HOR-79. Executing it against the real schema fails, and
it mixes never-applied intentions (for example the `storehorse.height`
widening, now owned by HOR-82) with structures that were later created by
other means.

It is preserved unmodified because it documents the previous developer's
intent — see `docs/adr/ADR-012` and Linear HOR-79 for the evidence and the
decision. The active history starts at `prisma/migrations/0_init/`, a faithful
baseline of the historical 30-table database, followed by explicit
modernisation migrations.
