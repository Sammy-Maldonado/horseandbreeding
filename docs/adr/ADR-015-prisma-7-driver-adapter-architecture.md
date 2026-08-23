# ADR-015: Prisma 7 driver-adapter architecture with ESM client generation

**Status:** Accepted
**Date:** 2026-08-23
**Deciders:** Sammy Maldonado

---

## Context

The application runs on the Prisma 6 major line with the classic architecture: the
`prisma-client-js` generator emitting into `node_modules/.prisma/client`, a Rust query
engine, the datasource URL declared inside `prisma/schema.prisma`, and
`node-linker=hoisted` in `.npmrc` whose recorded rationale is precisely that hoisted
emission path.

The Prisma 7 major line changes the architecture, not merely the version:

- A **driver adapter is mandatory**: `PrismaClient` cannot connect without one. Queries
  run through a query compiler instead of the Rust query engine binary.
- The **datasource `url` is no longer allowed in schema files** (validation error
  P1012). CLI database access moves to `prisma.config.ts`.
- The `prisma-client-js` generator is **deprecated** and no longer emits
  `node_modules/.prisma/client`; the modern `prisma-client` generator emits ESM
  TypeScript into an explicit output directory outside `node_modules`.
- `prisma migrate diff` renamed `--to-schema-datamodel` to `--to-schema`.

Prisma publishes no formal LTS line. Sammy granted an explicit, scoped exception for
this modernisation: target the current Prisma 7 stable line. The exception does not
weaken the general LTS-first dependency policy.

Binding constraints: ADR-001 (adopt, never rewrite), ADR-003 (schema preservation),
ADR-008 (a major upgrade is not a reorganisation), ADR-012 (Prisma Migrate baseline,
immutable `0_init`, 19 deferred DDL statements), ADR-013 (auth relies on a `Bytes`
token digest and interactive transactions). The database server is MariaDB 10.11; its
upgrade is a separate issue and out of scope here.

Roughly 44 server modules each construct their own `PrismaClient`, and about 20 of them
call `$disconnect()` per request in `finally` blocks. This topology is verified working
behaviour.

---

## Decision

1. **Target line.** Adopt the current **Prisma 7 stable line**. `prisma`,
   `@prisma/client` and `@prisma/adapter-mariadb` move in lockstep. Exact versions are
   owned by `package.json` and `pnpm-lock.yaml`, never restated in durable documents.
   Prisma 8 prerelease remains forbidden.
2. **Generator.** Replace `prisma-client-js` with the modern **`prisma-client`**
   generator (ESM, explicit output outside `node_modules`).
3. **Generated client location and ownership.** Output is **`generated/prisma/` at the
   repository root**, ignored by Git with an exact rule. The client is **not
   versioned**: it is regenerated deterministically from `prisma/schema.prisma` +
   `prisma.config.ts` + pinned dependencies via `postinstall` (`prisma generate`) or an
   explicit `pnpm exec prisma generate`.
4. **Driver adapter.** Connect through **`@prisma/adapter-mariadb`** with a **direct
   TCP connection**. No Accelerate, no Data Proxy, no Prisma Postgres, no external
   connection pooler, no new hosted database. The **`mariadb` driver is installed as a
   direct dependency pinned exactly to the version the adapter itself declares**, so
   exactly one driver instance exists in the dependency graph.
5. **CLI configuration.** `prisma.config.ts` owns the datasource URL for Migrate and
   the CLI, read from `DATABASE_URL` and declared **conditionally**: `prisma generate`
   and `postinstall` succeed without `DATABASE_URL` (clean CI, no fake credentials);
   commands that genuinely need connectivity fail clearly when it is absent.
   `prisma/schema.prisma` keeps `provider = "mysql"` only.
6. **pnpm linker.** The `node-linker=hoisted` premise (hoisted `.prisma/client`
   emission) is obsolete under Prisma 7. The setting is removed **within this change
   only after safe-deletion gates pass**: a clean install probe under the default
   linker must keep install, generate, tests, build and production runtime green, and
   no other dependency may rely on hoisting. If anything proves to rely on it, the
   setting stays and the evidence is recorded.
7. **Database preservation.** No schema change, no data change, no migration applied.
   `0_init` stays byte-identical; the residual `migrate diff` remains exactly the 19
   deferred statements governed by ADR-012; ADR-003 stays binding.
8. **Client lifecycle.** The per-module `PrismaClient` owners are **preserved** — no
   global singleton, no repository layer, no dependency-injection framework. Each
   `PrismaClient` receives **its own adapter instance**, built by the smallest shared
   helper that centralises connection-config construction only. A shared adapter
   across clients is rejected: the per-request `$disconnect()` sites would tear down a
   pool shared with in-flight requests.
9. **Rollback.** Reverting the change's commit series restores the Prisma 6
   architecture without any database state change.
10. **Boundary.** MariaDB server upgrade, database engine change, replacement of the
    reference database and infrastructure changes remain out of scope.

---

## Rationale

- Retaining `prisma-client-js` would keep a deprecated generator **and** an obsolete
  linker premise while still forcing every other v7 breaking change (adapter, config
  file, URL removal). Migrating to `prisma-client` removes both legacies at their
  root. Minimising the diff is explicitly not a goal.
- Not versioning the generated client keeps machine-generated output (dozens of files,
  megabytes) out of review diffs and eliminates silent drift between schema and
  committed client. Determinism is guaranteed by pinned dependencies plus
  `postinstall`.
- The repository-root `generated/prisma/` path is a top-level, exclusively generated
  directory: it mixes with no handwritten code (unlike `prisma/`, which is versioned
  and handwritten), needs no alias infrastructure to be imported from `server/` or
  tests, matches the documented default form, and allows an exact one-line Git ignore.
- Per-client adapters are the only lifecycle that satisfies both boundaries at once:
  no refactor of the ~44 owners, and no shared-pool teardown hazard. The short-lived
  adapter + client + `$disconnect` pattern is officially documented by Prisma. One
  pool per client mirrors the v6 per-client query-engine pools — no new topology.
- Pinning `mariadb` to the adapter's exact declared version prevents a second,
  never-used driver copy: the adapter always resolves its own pinned dependency.

---

## Consequences

### Positive

- Queries no longer depend on a Rust query engine binary; the driver stack is visible,
  configurable JavaScript.
- `prisma generate` works without `DATABASE_URL`, so CI needs no fake credentials.
- Generated code leaves Git; review diffs stay human-sized.
- The default pnpm linker (strict isolation) is restored once the safe-deletion gates
  pass.

### Negative

- Two new runtime dependencies (adapter + driver) now fall under the dependency
  policy's monitoring duties.
- A clean checkout cannot import the client until `postinstall` runs; a broken
  `postinstall` now blocks everything downstream.
- Around 46 files change their import surface in one change — mechanical, but large.
- Connection-pool defaults differ between the adapter and Prisma 6; pool settings must
  be reviewed consciously at wiring time.
- The generated client is application code now, so Nitro bundles it — and its opening
  `__dirname` shim calls `fileURLToPath(import.meta.url)`, which Nitro rewrites to a
  virtual URL that is invalid on Windows and crashes the production server at startup.
  The Prisma runtime never reads that global, so a dependency-free Rollup transform in
  `nuxt.config.ts` guards the one statement (try/catch; POSIX behaviour unchanged). The
  guard must survive future Nuxt/Nitro configuration rewrites, and a future Prisma
  version that changes the shim's text simply makes the guard a no-op — the failure
  mode returns on Windows only and is caught by starting the production build locally.

---

## Alternatives Considered

### Keep `prisma-client-js` under Prisma 7 — Rejected

Deprecated generator; still requires adapters, `prisma.config.ts` and URL removal; keeps
the obsolete hoisted-linker premise alive. Diff minimisation was explicitly rejected as
a reason to keep it.

### Version the generated client in Git — Rejected

Megabytes of machine-generated diff noise, drift risk between schema and committed
client, and no need: `postinstall` regenerates deterministically in CI and locally.

### Shared adapter or client singleton — Rejected

Out of scope (forbidden refactor of verified behaviour) and unsafe: per-request
`$disconnect()` calls would close a pool other in-flight requests are using.

### Stay on Prisma 6 — Rejected

Contradicts the modernisation mandate; the v6 line ages out of active support.

### Accelerate, Data Proxy, or an external pooler — Rejected

Explicitly excluded by the approval; the application keeps a direct connection.

### `mariadb` at registry latest — Rejected

The adapter pins an exact, older driver version and always uses its own copy; a newer
direct dependency would be dead weight with type-divergence risk.

---

## Review Triggers

- Prisma 8 reaches stable and a modernisation issue evaluates it.
- `@prisma/adapter-mariadb` changes its `mariadb` version pin or adds engine
  constraints.
- The MariaDB server upgrade issue lands and pool/compatibility settings need review.
- Any dependency is found to require the hoisted linker layout.
- Production evidence of connection exhaustion, which would justify a dedicated
  client-lifecycle issue.
