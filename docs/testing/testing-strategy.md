# Testing Strategy — Horse & Breeder

**Status:** Authoritative
**Scope:** Test policy, test categories, TDD, fixtures, data safety, local and CI gates,
dependency-modernisation regression gates, change control
**Related:** [CLAUDE.md](../../CLAUDE.md) · [runbooks/local-development.md](../runbooks/local-development.md) · [git-workflow.md](../git-workflow.md) · [adr/](../adr/)

---

## 0. Authority

This document is the **authoritative source** for the testing strategy of this
repository. Its rules are **binding on humans and coding agents equally**.

- **Policy lives here.** What must be tested, when, with which category of test, and what
  must pass before a change is promoted or a dependency is modernised.
- **Commands live in the runbook.** The operational "how to run it" — exact invocations,
  environment setup, troubleshooting — lives in
  [runbooks/local-development.md](../runbooks/local-development.md). This document links to
  it and does not duplicate it.
- **Architecture and data decisions live in the ADRs.** The Accepted ADRs under
  [docs/adr/](../adr/) remain authoritative for architecture and data ownership. This
  document references them; it never restates or overrides them.

Where this document and the runbook overlap, this document wins on **policy** and the
runbook wins on **commands**. Where this document and an ADR appear to differ on
architecture or data ownership, the **ADR wins** — raise the conflict rather than
resolving it here.

Changing a rule in this document follows the change-control rules in section 15.

---

## 1. Purpose

The strategy protects the **existing, verified behaviour** of an adopted application while
the project is modernised **incrementally**, never by rewrite
([ADR-001](../adr/ADR-001-adopt-existing-nuxt-application.md)).

The application was inherited with working pedigree behaviour and a real domain. The risk
during modernisation is not "too little new code" — it is **silently breaking behaviour
that already works**. Tests exist to make that breakage loud and early: fast feedback for
pure logic, a real framework context for components, and explicit regression gates before
any dependency moves.

This is not a mandate for total coverage. It is a mandate for **meaningful protection of
critical behaviour and regression risk** (see section 14).

---

## 2. Scope

This document covers:

- **Unit tests** — pure functions and isolated server logic.
- **Component tests** — Vue components and Nuxt-context units.
- **Integration tests** — several internal parts working together (future-facing policy).
- **End-to-end (E2E) tests** — full flows through a real browser (future-facing policy).
- **Dependency modernisation gates** — the minimum verification required before upgrading
  Node, pnpm, Nuxt, Vue, Prisma, Vite, Vitest or related tooling.

This document **does not introduce any new tool, service or dependency.** It does not add
Playwright, Cypress, a test database, or any other runner. Adopting any of those is a
separate, explicitly-approved decision (see section 15). The integration and E2E sections
below define **boundaries and intent**, not an instruction to build them now.

---

## 3. Current harness

Only the verified, current state is documented here. **Version numbers are deliberately
omitted** — they belong to [package.json](../../package.json) and
[pnpm-lock.yaml](../../pnpm-lock.yaml), which are the single source of truth for versions
and must not be duplicated where they can drift.

The harness today:

- **Vitest** is the test runner, invoked headless by a single command for CI.
- **Two isolated Vitest projects**, `node` and `nuxt`, configured in
  [vitest.config.ts](../../vitest.config.ts).
  - The **`node`** project runs in a pure Node environment and does **not** boot Nuxt.
  - The **`nuxt`** project runs in a Nuxt runtime with **happy-dom** as the DOM.
- **happy-dom** is the installed DOM environment. jsdom is intentionally not installed.
- **@nuxt/test-utils** provides the Nuxt test environment and the component-mounting API.
- **@vue/test-utils** underpins component mounting.
- **Naming convention** routes each file to exactly one project: `*.test.ts` for Node,
  `*.nuxt.test.ts` for Nuxt (section 5).
- **Component tests** mount through `mountSuspended` and run in the `nuxt` project.
- **CI check** — every Pull Request must pass the `Test / Build` check produced by the
  `CI` workflow (section 10).

The exact commands for running each project live in
[runbooks/local-development.md](../runbooks/local-development.md).

---

## 4. Test categories

### Node tests

- **Filename pattern:** `*.test.ts` (also `*.spec.ts`).
- **Environment:** `node`.
- **Use for:** pure functions, utilities and isolated server logic — anything that does
  not need a browser DOM or the Nuxt runtime.
- **Must not** boot Nuxt.
- **Must not** require a DOM.
- **Must not** connect to `hbold` or any database.
- **Examples in this repository:**
  [server/utils/authorization.test.ts](../../server/utils/authorization.test.ts) — role
  and scope checks; and
  [server/utils/storehorse-compat.test.ts](../../server/utils/storehorse-compat.test.ts) —
  the `storehorse.status` compatibility layer, exercised with a minimal in-memory client
  stand-in rather than a real database.

Node tests are the fast tier. They are where the RED→GREEN cycle should stay quick, so
they never pay for a browser-like environment.

### Nuxt tests

- **Filename pattern:** `*.nuxt.test.ts`.
- **Environment:** Nuxt runtime with happy-dom.
- **Use for:** Vue components, composables, auto-imports, plugins or Nuxt injections —
  anything that needs a real Nuxt context to behave correctly.
- **Mounting:** `mountSuspended` from `@nuxt/test-utils/runtime` is the **preferred
  component-mounting API** when a Nuxt context is required, because it resolves
  auto-imported components and awaits async setup.
- **Must not** connect to `hbold` or any database.
- **Example in this repository:**
  [components/RecursiveCompetitionHistory.nuxt.test.ts](../../components/RecursiveCompetitionHistory.nuxt.test.ts) —
  a maternal-line renderer smoke test that stubs its child component and asserts stable
  behaviour, never touching the database.

Nuxt tests are the slower tier because they boot a Nuxt environment. Only reach for this
category when a Node test genuinely cannot express the behaviour.

### Integration tests

Integration tests exercise **several internal parts working together** — for example, a
server endpoint together with the query-building and compatibility logic it depends on —
rather than a single unit in isolation.

Policy:

- They must remain **deterministic**: same inputs, same result, every run.
- They must **not** connect automatically to production services or Sammy's local
  database.
- Any **ephemeral database or external service** an integration test might need in the
  future requires **its own Linear issue and an explicit decision** before it is
  introduced. It is not added silently as part of writing a test.

Until such a decision is made, integration-level coverage is expressed within the existing
two projects using in-memory stand-ins, exactly as the compatibility-layer tests already
do.

### E2E tests

E2E tests exercise **complete user flows through a real browser**.

Policy:

- There is currently **no official E2E tool** in this repository.
- Adopting **Playwright or any alternative requires its own Linear issue and decision**
  (and, because it introduces a major tool, likely an ADR — see section 15). It is out of
  scope for day-to-day work until then.
- E2E tests **must not be confused with Nuxt component tests.** A Nuxt component test
  mounts one component in a Nuxt runtime with happy-dom; it is not a browser, not a full
  application, and not a substitute for an E2E flow.

---

## 5. File placement and naming

- **Test files live beside the code they protect** — the test sits next to its subject,
  not in a distant mirror tree.
- **Pure tests** use `*.test.ts` and run in the `node` project.
- **Nuxt-context tests** use `*.nuxt.test.ts` and run in the `nuxt` project.
- **No file may run in both Vitest projects.** The `*.nuxt.test.ts` suffix is the single
  switch that routes a file to exactly one project; the include/exclude globs are mutually
  exclusive by design.
- **Fixtures may live beside a test**, and may be promoted to a shared location only when
  genuinely reused by more than one test.
- **A test file inside `pages/` does not become a route.** `@nuxt/schema`'s default
  `ignore` list excludes `**/*.{spec,test}.{js,cts,mts,ts,jsx,tsx}`, so the page scanner
  skips `*.test.ts` and `*.nuxt.test.ts` and the router never sees them. Locality
  therefore applies to pages exactly as it does everywhere else — a page's test belongs
  beside the page. Verified for Nuxt 4.5.2; re-confirm it during a major Nuxt upgrade
  (section 11), because a build that started routing test files would ship them.
- **Do not create large generic test folders** (`__tests__/`, `test/`) without a real
  need. Locality keeps the test discoverable from the code it defends.

---

## 6. TDD workflow

**RED → GREEN → REFACTOR is mandatory** for:

- new behaviour;
- bug fixes;
- changes to the `storehorse` compatibility layer;
- significant refactors.

The cycle:

- **RED** — write a test that fails **for the expected reason**, encoding the acceptance
  criteria (happy path, edge cases, error states).
- **GREEN** — write the **smallest** implementation that makes it pass. No extras.
- **REFACTOR** — improve structure while the tests stay green.

Rules:

- A test **added after** the implementation does **not** prove a real RED stage. If you
  cannot show the test failing first, you have not done TDD — you have written a
  confirmation.
- **Temporary, intentionally-failing tests must never be committed.** They are a local
  probe to prove the harness detects failure (section 13); they are removed before any
  commit and never staged.
- **Documentation-only changes do not require an artificial failing test.** Do not
  manufacture a RED stage for a change that alters no behaviour.

---

## 7. Fixtures and mocks

Fixtures and mocks must be:

- **small** — the minimum shape the unit under test consumes;
- **explicit** — readable in the test, not hidden behind machinery;
- **deterministic** — no randomness, no clock dependence, no ordering surprises;
- **fictional when possible** — invented names and values, not copied real data;
- **in memory** — no external files or services.

Prohibited:

- **No copied private datasets.** Real client documents and real catalogue data are never
  used as fixtures (see section 8 and CLAUDE.md §7).
- **No real production credentials**, tokens, or connection strings in a test.

Mocking discipline:

- **Mock only external boundaries** — the database client surface, the network, the file
  system.
- **Do not over-mock the unit under test.** If the test only exercises mocks, it proves
  nothing about the real code.
- **No full-page HTML snapshots by default**, and no assertions bound to fragile class
  names or whitespace. **Prefer behavioural assertions** — what the component renders or
  emits, not its exact markup. The existing component test is the reference: it stubs the
  child and asserts the presence/absence of a rendered node and the empty-state message,
  not a serialized DOM.

---

## 8. Data and Prisma safety

This section **references** the binding decisions; it does not restate them. Read
[ADR-003](../adr/ADR-003-prisma-schema-preservation.md) (preserve the Prisma schema) and
[ADR-006](../adr/ADR-006-storehorse-column-compatibility-layer.md) (the `storehorse`
compatibility layer) in full.

Binding rules for tests:

- **Component tests must not connect to `hbold`.** Neither must Node or integration tests
  in the current harness.
- **No test may modify `hbold`.**
- **No destructive Prisma commands** are run as part of testing.
- **Never run `prisma db pull` against the committed schema.** Use
  `pnpm exec prisma db pull --print` only when an approved introspection is genuinely
  needed.
- **Do not delete schema fields to make a test pass.** Absence from `hbold` is drift, not
  obsolescence ([ADR-003](../adr/ADR-003-prisma-schema-preservation.md)).
- **The `storehorse` compatibility behaviour must preserve both cases** — the column
  supported *and* the column absent. Tests must cover both, because the whole point of the
  layer is that it suppresses the filter where the column is missing and applies it where
  it exists.
- **Probe errors must remain observable.** A failed capability probe propagates; it is
  never silently defaulted to a guess. Tests assert that propagation.
- **Marketplace drift outside [ADR-006](../adr/ADR-006-storehorse-column-compatibility-layer.md)**
  (for example `currency`, `age`, `ad_title`, `seller_id`) is **not** silently folded into
  the existing compatibility layer or its tests. It gets its own issue.

### The Prisma schema is verified through the SQL it generates

**`prisma validate` exiting `0` does not mean the schema generates valid SQL.** It checks
that the *Prisma* syntax is well formed, and nothing more. HOR-80 proved the gap: 68
`@default(dbgenerated("..."))` declarations carried corrupted literals, `dbgenerated`
copied each argument verbatim into the generated DDL, and MariaDB rejected the result with
`ERROR 1064` on the first `CREATE TABLE` — while `prisma validate` had exited `0` the whole
time.

Binding rules for any change to `prisma/schema.prisma`:

- **Assert on the generated artifact, not on the schema text.** A source-text search for
  `dbgenerated` would not have caught HOR-80, because the defect was never the function —
  it was what the function emitted. Generate the migration SQL and assert on that.
- **`prisma validate` alone is never sufficient evidence.** Neither is `prisma generate`.
  Both can succeed against a schema that produces unusable SQL.
- **Use `prisma migrate diff --from-empty --to-schema`** to produce that SQL. It
  needs **no database connection**, which is what makes it usable as an ordinary `node`
  test rather than an integration test. (Prisma 7 renamed the flag from the earlier
  `--to-schema-datamodel`; the command is otherwise unchanged.)
- **Point `DATABASE_URL` at a deliberately unreachable address in such a test.** If a
  regression ever makes the diff require a live connection, the test must fail rather than
  silently start depending on a developer's local MariaDB. Under Prisma 7 this variable
  also makes `prisma.config.ts` declare its datasource — without it the config omits the
  datasource block and `migrate diff` exits 0 with an **empty** script instead of the
  schema's SQL, which would pass a naive gate while asserting nothing.
- **Prove the gate fails.** Restore the previous schema and confirm the test goes RED. A
  gate that has never failed is not known to protect anything (section 13).
- **Applying generated SQL for verification targets a disposable database only.** Never
  `hbold`, and never as part of `pnpm test` — the automated gate asserts on the SQL, and
  execution against a throwaway database is issue evidence recorded in Linear.

The current implementation of this gate is
[prisma/schema-defaults.test.ts](../../prisma/schema-defaults.test.ts).

---

## 9. Required local gates

The current minimum local gates, run from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

Rules:

- **A local green result is required** before a change is proposed for promotion.
- **Local green does not replace GitHub CI** (section 10). A local machine uses a local
  `node_modules`, a local Node version and a local environment; CI runs clean. They can
  disagree.
- **Commands must finish successfully** — an interrupted or skipped command is not a pass.
- **Warnings are reviewed, not ignored.** A warning is information about a latent problem,
  not noise to scroll past.

The exact per-project and single-file commands live in
[runbooks/local-development.md](../runbooks/local-development.md).

---

## 10. Required GitHub gate

- **Workflow:** `CI` ([.github/workflows/ci.yml](../../.github/workflows/ci.yml)).
- **Required check:** `Test / Build`.

Rules:

- **`Test / Build` is the authoritative required check** for every Pull Request into
  `DEV`, `QA` and `main`.
- **"No checks reported" is not a passing check.** A pending, missing or failed check
  **blocks promotion**. Describing an absent check as a pass is the fastest route to an
  unverified change reaching `main`.
- **Every promotion Pull Request must show the real check result** before it is merged.
- **Branch protection and the repository ruleset remain authoritative.** The mechanics —
  merge-commit-only, required check, no bypass — are owned by
  [git-workflow.md](../git-workflow.md) and must not be weakened to make a change pass.

---

## 11. Dependency modernisation gate

Before upgrading **Node, pnpm, Nuxt, Vue, Prisma, Tailwind, Vite, Vitest or related
tooling**, at minimum the following must be verified. Modernisation is precisely when
regressions hide, so this gate is not optional.

### Automated

- `pnpm install --frozen-lockfile`;
- the **`node`** project tests pass;
- the **`nuxt`** project tests pass;
- the **complete `pnpm test`** passes;
- `pnpm build` passes;
- `Test / Build` is green in **every** promotion Pull Request.

### Manual regression

These verify the core pedigree behaviour the Automation MVP depends on, including the
`storehorse.status` compatibility path ([ADR-006](../adr/ADR-006-storehorse-column-compatibility-layer.md)):

- search for **ERNE ALERT**;
- open the **ERNE ALERT** pedigree;
- verify the **sire and dam render**;
- verify **known ancestors render** where the data exists;
- verify **maternal-line behaviour**;
- verify the **`storehorse.status` error does not return**.

### Presentation regression — required when an upgrade can change how the application looks

The automated gates above prove the application still *works*. They cannot see how it
*looks*: a styling upgrade can restyle every page while every test passes and the build stays
green. When the upgrade touches CSS tooling, the design system, or anything that resolves
style — Tailwind, PostCSS, a UI component library, a theme package — the gate additionally
requires:

- **Capture the built stylesheet before and after**, and compare it. Comparing the served
  HTML is not sufficient: this project links its stylesheet rather than inlining it, so a
  style change leaves the markup byte-identical.
- **Compare the values, not the version.** For every design token the application actually
  uses, verify what the new build *emits* against what the old build emitted. Release notes
  and upgrade guides are a starting point, never the evidence — a default can move in a patch
  release, and an upgrade guide correctly omits changes that did not happen between the
  majors it documents.
- **Compare rendered class attributes route by route**, before and after, normalising any
  deliberate utility rename. A difference that no rename explains is a regression until
  proven otherwise.
- **State what the evidence does not cover.** Declaration-level and markup-level comparison
  proves the same classes reach the same elements and resolve to the same declarations. It is
  not a pixel comparison. Say so explicitly rather than letting "verified" imply screenshots.

**A visible default change is a decision for Sammy, not a finding to absorb.** Where holding
the previous appearance and adopting the new one are both legitimate, stop and present the
measurement. Anything held to keep the old appearance is a temporary compatibility layer and
is documented as one — never as the project's design.

**When Sammy adopts a new default, the baseline moves with it.** From that point the previous
appearance is history, not the reference: a difference against it is the approved design and
must not be reported as a regression. A regression is then a difference between what the
adopted default is expected to emit and what the application actually emits — verified by
compiling the entry stylesheet with the project's own compiler and comparing it against the
state the decision was taken on. **Never restore an old value to make a comparison pass.** That
inverts the gate: it hides the real difference and reintroduces the compatibility layer the
decision retired. The current appearance baseline is recorded in the ADR that owns the
decision — for styling, [ADR-009](../adr/ADR-009-tailwind-vite-plugin-and-v3-compatibility-layer.md).

### Where each check runs

- **Manual search and pedigree regression require the local `hbold` database.**
- **Unit and component tests do not** require `hbold`.
- **GitHub Actions must not connect to Sammy's local database.** The manual regression is
  a local human step, not a CI step.

**Do not turn this manual regression data into private CI fixtures.** The manual checks
stay manual and local; they are never smuggled into the automated pipeline as copied
private data.

---

## 12. Regression expectations by change type

| Change type | Minimum expected verification |
|---|---|
| Utility / pure logic change | `node` project tests |
| Vue component or composable change | `nuxt` project tests |
| `storehorse` compatibility change | `node` regression tests **plus** manual `hbold` validation (section 11) |
| Dependency update | complete automated gates **plus** relevant manual regression (section 11) |
| Styling, theme or CSS-tooling update | everything a dependency update requires **plus** the presentation regression (section 11) |
| Documentation-only change | `pnpm test` and `pnpm build` stay green; **no artificial RED test** |
| `prisma/schema.prisma` change | `node` assertions on the **generated migration SQL**, not on the schema text (section 8); `prisma validate` alone is not evidence |
| Future database migration | dedicated Linear issue, migration plan, rollback plan, and integration evidence |

---

## 13. CI failure proof

The harness is only useful if a real failure actually fails the build. Therefore:

- **`pnpm test` must return a non-zero exit code when a test fails.** This is verified,
  not assumed — HOR-46 proved it with a temporary throwaway failing test that made
  `pnpm test` exit non-zero, then removed it.
- **Temporary failing probes must be removed before commit** and never staged (section 6).
- **No red commit may be promoted.** A failing local run is a stop, not a note to fix
  later.
- **The real GitHub `Test / Build` check is the final automated evidence** (section 10).

---

## 14. Coverage policy

- The **current goal is meaningful protection, not an arbitrary percentage.** Protect
  critical behaviour and regression risk first.
- **Do not write duplicate tests only to raise a number.** A test that asserts nothing new
  is maintenance cost with no protection.
- **Prioritise critical behaviour and regression risk** — the pedigree pipeline, identity
  and write-up rules, the compatibility layer, authorization.
- **Coverage thresholds require their own issue and evidence.** Turning on a global
  percentage gate is a policy change, not a default.
- **The absence of a global percentage does not permit untested new behaviour.** New
  behaviour in the mandatory areas still follows RED→GREEN (section 6), threshold or not.

---

## 15. Change control

Each of the following changes a durable testing decision and therefore requires **its own
Linear issue** before it is made:

- replacing Vitest;
- replacing happy-dom;
- adopting an E2E framework (for example Playwright);
- connecting tests to an ephemeral database;
- adding global coverage thresholds;
- changing the file-naming conventions;
- merging the `node` and `nuxt` test projects into one;
- allowing component tests to use `hbold`.

**Updating this document is enough** when the change refines policy without altering
architecture or data ownership — clarifying a rule, adding a category boundary, recording a
new regression step, tightening fixture discipline.

**An ADR may additionally be required** when the change introduces or replaces a major
technology, changes a durable domain or data invariant, or creates a new migration or
compatibility strategy — for example adopting an E2E framework or connecting tests to a
real ephemeral database. In that case the ADR owns the decision and this document is
updated to reference it. See [docs/adr/README.md](../adr/README.md) for when an ADR is
warranted.

---

## 16. Related documents

- [CLAUDE.md](../../CLAUDE.md) — the execution contract; carries a concise binding summary
  and points here.
- [runbooks/local-development.md](../runbooks/local-development.md) — the practical
  commands for running the tests and the build.
- [git-workflow.md](../git-workflow.md) — branching, promotion, required checks and merge
  rules.
- [ADR-001](../adr/ADR-001-adopt-existing-nuxt-application.md) — adopt and modernise the
  existing Nuxt application; do not rewrite.
- [ADR-003](../adr/ADR-003-prisma-schema-preservation.md) — preserve the committed Prisma
  schema against legacy `hbold`.
- [ADR-004](../adr/ADR-004-pnpm-package-manager.md) — pnpm is the official package manager.
- [ADR-006](../adr/ADR-006-storehorse-column-compatibility-layer.md) — compatibility layer
  for drifted `storehorse` columns.
