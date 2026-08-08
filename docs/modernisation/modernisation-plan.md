# Dependency Modernisation Plan — Horse & Breeder

**Status:** Authoritative for modernisation *progress*
**Scope:** Which modernisation stages exist, which are complete, which comes next, and
where the real versions live
**Related:** [CLAUDE.md](../../CLAUDE.md) · [testing/testing-strategy.md](../testing/testing-strategy.md) · [git-workflow.md](../git-workflow.md) · [adr/ADR-001](../adr/ADR-001-adopt-existing-nuxt-application.md) · [adr/ADR-004](../adr/ADR-004-pnpm-package-manager.md)

---

## 0. Authority

This document is the **authoritative in-repository record of modernisation progress** —
which stage finished, which is next, and where the evidence lives.

It is deliberately **not** a version manifest. It records *progress*, never *versions*.

- **Real versions live in executable sources.** `package.json` and
  `.github/workflows/ci.yml` are the only places a current version number is stated.
- **Detailed implementation evidence lives in Linear.** Each stage has its own issue with
  commands, logs, run IDs and merge SHAs. This document summarises; it never copies that
  evidence.
- **Architecture decisions live in the ADRs.** This document references them and never
  restates or overrides them.
- **The original audit lives in Linear HOR-48.** That issue owns the stage map, the
  compatibility matrix and the order rationale.

Where this document and an executable source disagree about a version, **the executable
source wins and this document is wrong.**

---

## 1. Purpose

Horse & Breeder is an **adopted** application. It is modernised **incrementally and never
by rewrite** ([ADR-001](../adr/ADR-001-adopt-existing-nuxt-application.md)).

The upgrade path is therefore split into stages that are each independently reviewable,
testable and revertible to `main`. One stage at a time, in dependency order, so that no
Pull Request is ever forced to carry two unrelated majors.

This document exists so that a future session — human or agent — can answer four questions
without reconstructing them from issue comments or agent memory:

```txt
which stage finished
what changed and why
which stage comes next
where the real versions and the real evidence live
```

---

## 2. Sources of truth

| Source | Owns |
|---|---|
| `package.json` → `packageManager` | the pnpm version |
| `package.json` → `engines.node` | the Node.js runtime range the project supports |
| `package.json` → `dependencies` / `devDependencies` | the declared dependency ranges |
| `.github/workflows/ci.yml` → `node-version` | the Node.js version used by CI |
| [ADR-004](../adr/ADR-004-pnpm-package-manager.md) | the decision to use pnpm, and `packageManager` as its single source of truth |
| [ADR-001](../adr/ADR-001-adopt-existing-nuxt-application.md) | adopt and modernise; never rewrite |
| [testing/testing-strategy.md §11](../testing/testing-strategy.md) | the automated and manual gates every stage must pass |
| Linear **HOR-48** | the original audit, the full stage map and the order rationale |
| Linear — the stage issue | detailed implementation evidence for that stage |
| Engram | operational memory for agents, advisory and always verified against the above |

**Version numbers are not duplicated into permanent documentation.**
[ADR-004](../adr/ADR-004-pnpm-package-manager.md) rejected that explicitly, on the grounds
that documentation drifts from reality while `packageManager` stays enforceable. This
document does not reintroduce the practice.

When a stage begins, its target versions are **re-validated from primary sources** —
Context7 first, then official release pages, registry dist-tags and end-of-life schedules.
Targets recorded during an earlier audit are treated as a **snapshot of that date**, not as
an instruction. Stage B superseded the audit's own numbers for exactly this reason.

---

## 3. Stage status

The stage map originates in the HOR-48 audit. Scope is described here; **target versions
are deliberately omitted** and are re-validated when each stage starts.

| Stage | Scope | Issue | Status |
|---|---|---|---|
| **A** | GitHub Actions major versions (`checkout`, `setup-node`, `pnpm/action-setup`, `release-please-action`) | HOR-42 | **Done** |
| **B** | Node.js runtime and pnpm tooling (`packageManager` + CI `node-version`) | HOR-50 | **Done** |
| **C** | `package.json` metadata hygiene — align declared ranges to resolved, add `engines` | HOR-54 | **Done** |
| **D** | Remove the deprecated PrimeVue Nuxt module and wire the supported one | HOR-55 | **Done** |
| **E** | Prisma client major upgrade — client only, no database or schema change | Not created | **Next** |
| **F** | Contained single-major library upgrades, split one issue per library | Not created | Planned |
| **G** | Nuxt framework major migration — the pivot; includes the content-module sub-migration | Not created | Planned |
| **H** | Tailwind CSS major migration — depends on the build tooling that arrives with Stage G | Not created | Planned |
| **I** | Stripe integration modernisation, including replacing the unmaintained module | Not created | Planned |
| **J** | Deferred and ADR-heavy items — next Prisma major, MariaDB LTS migration, PrimeVue major, router major, dead-weight cleanup, advisory sweep, Python patch | Not created | Deferred |

**Order rationale:** external tooling → runtime → hygiene → dead-weight removal → contained
data layer → contained libraries → framework (the pivot) → CSS → payments → deferred and
ADR-heavy. Each earlier stage de-risks the next.

**Only Stages A, B, C and D have Linear issues.** Stages E–J are planned but **not
created**. Creating a stage issue requires Sammy's authorisation.

---

## 4. Completed — Stage A (HOR-42)

The four GitHub Actions used by `ci.yml` and `release-please.yml` were moved to their
latest GitHub-supported majors, verified against each action's official releases rather
than assumed.

- Workflow hygiene only. **No application, dependency, schema, database or environment
  change.**
- What the workflows *do* was unchanged.
- A real run's logs were checked for Node.js deprecation warnings.
- Promoted issue branch → DEV → QA → main with `Test / Build` green at every step.

Run first, and deliberately so: it is independent of everything else and de-risks CI ahead
of the entire chain.

---

## 5. Completed — Stage B (HOR-50)

The runtime and package-manager tooling were moved forward. Two declarations changed;
nothing else.

### What changed

- `package.json` → `packageManager`, the pnpm version.
- `.github/workflows/ci.yml` → `node-version`, the Node.js version used by CI.

That is the complete change set. **Only the authorised declarations were touched.**

### Why

Local development and CI needed to run on a supported runtime, and the later stages needed
a stable foundation to build on — without changing application behaviour.

The Node.js move stayed **inside the adopted Active LTS line**. The line itself was not
changed, and the current *Current* release was explicitly excluded because it is not yet
LTS. pnpm remained the **official and only package manager**
([ADR-004](../adr/ADR-004-pnpm-package-manager.md)); only its pinned version moved.

> **Historical note.** Stage B adopted Node.js 24.19.0 and pnpm 11.20.0 on 2026-08-08.
> These two numbers are recorded **as the values HOR-50 adopted on that date** — they are a
> historical record, not standing policy. The versions in force today are whatever
> `package.json` and `.github/workflows/ci.yml` declare now.

### What deliberately did not change

- `pnpm-lock.yaml` required **no change** — the frozen install stayed valid.
- **No application dependency was updated.** Not Nuxt, Vue, Vite, Vitest, Prisma, Tailwind,
  PrimeVue, Stripe or TypeScript.
- **ADR-004 was not modified and no new ADR was created.** Stage B introduced no new
  architecture decision: `packageManager` remained the single source of truth, and changing
  the pinned version still requires an approved Linear issue — which HOR-50 was. The
  audit's note that Stage B would require an "ADR-004 update" was discarded, because
  writing a version number into an ADR is precisely what that ADR decided against.
- Prisma, the `hbold` reference database, and `node-linker=hoisted` in `.npmrc` were all
  untouched. Prisma Client still resolves.
- `README.md` and [runbooks/local-development.md](../runbooks/local-development.md) needed
  no edit: both already delegate to `package.json` and `ci.yml` instead of repeating
  version numbers.

### What was verified

Full dependency-modernisation gate,
[testing-strategy §11](../testing/testing-strategy.md):

```txt
pnpm install --frozen-lockfile        clean, lockfile unchanged
Vitest node project                   pass
Vitest nuxt project                   pass
complete pnpm test                    pass — 3 files, 28 tests
pnpm build                            pass
```

Manual regression, run locally against `hbold` and never in CI: the **ERNE ALERT** search
and pedigree, sire and dam rendering, known ancestors, maternal-line behaviour, and
confirmation that the `storehorse.status` error **did not return**
([ADR-006](../adr/ADR-006-storehorse-column-compatibility-layer.md)).

All three promotion Pull Requests carried a **real, green `Test / Build`** triggered by the
`pull_request` event. A manual `workflow_dispatch` run on the same commit was explicitly
**not** accepted as merge authorisation — it does not satisfy the repository ruleset.

### CI note

A GitHub Actions platform incident during the implementation window dropped
workflow-triggering events; it was **external to this repository** and has been resolved.
The normal `pull_request` → `Test / Build` flow works again. No ruleset was relaxed, no
administrative merge was used, and no artificial commit was created to trigger CI.

### Release Please

Release Please ran correctly on `main` and produced **no release Pull Request** — the
change was a `chore`, which is not user-facing. That is the expected outcome, not a
failure. No tag or release was created manually.

---

## 6. Completed — Stage C (HOR-54)

`package.json` was made to describe what the project actually installs and actually runs
on. Metadata only.

### What changed

- **The declared dependency ranges.** Twenty-five direct dependencies declared a floor
  below the version that already resolved. Each floor was raised to the version already in
  the lockfile.
- **`engines.node` was added.** The project had never declared the Node.js runtime it
  supports.
- `pnpm-lock.yaml` — the `importers` `specifier:` lines only, synchronised by pnpm. The
  lockfile was never hand-edited.

That is the complete change set.

### Why

A declared floor that lags the resolved version is a promise the repository does not keep.
It tells a fresh install that a version verified by nobody is acceptable, and it hides
which upgrades a later stage still has to make. Raising each floor to the version already
installed **restricts** future resolution; it never widens it.

Every raise was tested individually against the same five questions: the resolved version
already satisfied the old range — that is why it resolved; the change is therefore
declarative only; it raises the floor rather than lowering it; it is not an upgrade,
because the installed tree is untouched; and it crosses no major, so it belongs to no
other stage. **No range change crossed a major boundary.**

`engines.node` turns the LTS rule in §9 from documentation into something the toolchain
enforces. Its floor is the runtime Stage B adopted and CI verifies; its ceiling keeps the
project on the **adopted Active LTS line**, so a *Current* release cannot creep in through
a contributor's machine. Moving that line stays a future stage's job, with its own issue
and its own gates. The exact range lives in `package.json` and is not repeated here.

> **Consequence, recorded deliberately.** pnpm enforces `engines` **hard for the project
> itself**, independently of `engineStrict`: an incompatible runtime fails the install
> rather than warning. That is the intended effect — it is the reason the field is worth
> adding — but it is a real behavioural change in a stage otherwise labelled hygiene, and
> a contributor on an unsupported Node.js line will meet it as a failed install.

### What deliberately did not change

- **No resolved version moved.** The installed tree before and after is identical: 51
  direct dependencies, none added, none removed, not one resolved version different, no
  integrity or resolution line touched anywhere in the lockfile.
- **The four exactly-pinned devDependencies were left alone.** They are pinned on purpose
  by the HOR-46 harness hardening and showed no drift.
- **`packageManager` was not touched**, and **`engines.pnpm` was not added**.
  [ADR-004](../adr/ADR-004-pnpm-package-manager.md) made `packageManager` the single source
  of truth for the pnpm version and rejected duplicating that number into a second place
  that then drifts; `engines.pnpm` would have recreated exactly what it rejected.
- **`engines.runtime` was not added.** It makes pnpm download and install a Node runtime,
  which changes install behaviour and is not metadata hygiene.
- No dependency was added, removed or upgraded. No pre-release was introduced. Prisma, the
  `hbold` reference database, `prisma/schema.prisma`, the Python extractor and CI were all
  untouched.
- **No ADR was created or modified.** Stage C introduced no architecture decision:
  `engines.node` is the executable form of a rule §9 had already approved.

### What was verified

Full dependency-modernisation gate,
[testing-strategy §11](../testing/testing-strategy.md):

```txt
pnpm install --frozen-lockfile        clean
Vitest node project                   pass — 2 files, 26 tests
Vitest nuxt project                   pass — 1 file, 2 tests
complete pnpm test                    pass — 3 files, 28 tests
pnpm build                            pass
```

Manual regression, run locally against `hbold` and never in CI: the **ERNE ALERT** search
and pedigree, sire and dam rendering, ancestors resolved through `sire_id` / `dam_id`,
maternal-line traversal through `dam_id`, and confirmation that the `storehorse.status`
error **did not return** — the compatibility layer still detects the column's absence and
contributes nothing to the filter ([ADR-006](../adr/ADR-006-storehorse-column-compatibility-layer.md)).
The database was not modified.

All three promotion Pull Requests carried a **real, green `Test / Build`** triggered by the
`pull_request` event.

---

## 7. Completed — Stage D (HOR-55)

### What changed

**One dependency removed: `nuxt-primevue`.** Nothing else. The commit touches
`package.json` and `pnpm-lock.yaml` and **no source file**.

### Why

The package is deprecated by its own publisher, which points at the supported successor
already declared in this project. It was also dead weight: nothing referenced it, and it
dragged in a **second, older major of PrimeVue** alongside the supported one, so two
majors of the same library resolved in the tree at once.

### The audit question this stage answered

The HOR-48 row offered an alternative — wire the supported module **or confirm the
resolver path**. The repository proved the second. PrimeVue is wired through
`unplugin-vue-components` with `PrimeVueResolver` in `nuxt.config.ts` under `vite.plugins`,
and the PrimeVue Nuxt module is **deliberately commented out** of `modules`. The generated
component manifest contains **zero PrimeVue components** — `Menu` comes from Headless UI,
`Carousel` from `vue3-carousel` — and no PrimeVue plugin is registered. The only live
consumption of the family is `primeicons/primeicons.css`.

There was therefore nothing to wire. Confirming the resolver path was the correct outcome,
and `nuxt.config.ts` was deliberately left untouched.

The conclusion came from the **real dependency graph**, resolved with `pnpm why`, not from
a text search.

### What deliberately did not change

- **`nuxt.config.ts` was not modified.** It holds the wiring this stage confirmed.
- No source, test, style or asset file was touched.
- The supported PrimeVue packages — the Nuxt module, the theme package, `primevue` and
  `primeicons` — were all left at their declared ranges. Crossing the PrimeVue major
  belongs to **Stage J**.
- No dependency was added. No version was upgraded. No pre-release was introduced.
- **No ADR was created or modified.** The HOR-48 row records ADR impact: none, and
  removing a deprecated, unreferenced package decides nothing durable.
- Prisma, `prisma/schema.prisma`, the `hbold` reference database, the Python extractor and
  CI were untouched.

### Lockfile

The package count fell by exactly two: the removed module and the older PrimeVue major it
carried. **Nothing was added and no resolved version changed.** The remaining diff is
pnpm's peer-suffix normalisation of entries that already existed — reproduced identically
by an unrelated `pnpm remove` on a throwaway branch, which is what proves it is *keying*
and not a version change. `pnpm why primevue` now reports a single version where it
previously reported two majors.

The change was performed with `pnpm remove`. Neither file was hand-edited.

### What was verified

Automated gate, [testing-strategy §11](../testing/testing-strategy.md):

```txt
pnpm install --frozen-lockfile        clean
Vitest node project                   pass — 2 files, 26 tests
Vitest nuxt project                   pass — 1 file, 2 tests
complete pnpm test                    pass — 3 files, 28 tests
pnpm build                            pass
```

Application smoke test against a dev server started **after** the removal: eight routes
answered `200` — home, login, register, search, pedigree, mare line, progeny and
horses-for-sale. `primeicons.css` was served. No unresolved component, no missing module,
and no reference to the removed package anywhere in the server output.

All three promotion Pull Requests carried a **real, green `Test / Build`** triggered by the
`pull_request` event.

> **Gate deviation — recorded, not hidden.** The manual `hbold` regression required by §9
> and by [testing-strategy §11](../testing/testing-strategy.md) **could not be executed**
> for this stage. Every `/api` request on the local machine returns `401`, because the API
> key that `server/middleware/validateApiKey.ts` requires is not defined in the local
> environment. The gap is **pre-existing and independent of this stage** — the commit
> contains no source file and cannot affect authentication — but the regression was not
> run, so Stage D is recorded as having passed the **automated gate and the UI smoke test
> only**. The local environment must be repaired **before Stage E**, whose blast radius is
> the data layer itself and which cannot be signed off without that regression.

### Findings raised, not acted on

- The PrimeVue **theme package is marked deprecated by its publisher**, pointing at a
  successor. Outside Stage D's scope.
- `unplugin-vue-components` and the PrimeVue auto-import resolver are **imported by
  `nuxt.config.ts` but declared in no `package.json` field**. They resolve only
  transitively, through the PrimeVue Nuxt module. The build works today and Stage D did not
  change that, but the wiring depends on packages the project never declares.

Each needs Sammy's decision and its own issue. Neither was acted on here.

---

## 8. Next stage — Stage E

**Stage E is next and has not been started.** Its Linear issue does **not** exist.

Scope, from the HOR-48 audit: the **Prisma client major upgrade — client only**. It
includes the MySQL full-text-search preview-flag cleanup and a client regeneration, and it
changes **no database and no schema** — no model and no field is deleted, per
[ADR-003](../adr/ADR-003-prisma-schema-preservation.md). It depends on Stage B. It is
**ADR-003-sensitive**, and the [ADR-006](../adr/ADR-006-storehorse-column-compatibility-layer.md)
`storehorse` compatibility layer must be **re-tested against `hbold`** as part of its gate.

Target versions are deliberately not recorded here and are re-validated when the stage
starts (§2).

**Blocking precondition:** the local `hbold` regression environment must work again — see
the gate deviation in §7. Stage E touches the data layer and cannot be signed off on
automated gates alone.

Creating the Stage E issue **requires Sammy's authorisation**. No agent starts it
automatically.

---

## 9. Rules

Binding for every stage:

- **One stage at a time.** Stages are not bundled, and a stage is not started because the
  previous one finished.
- **Versions are re-validated at stage start**, from primary sources — Context7 first,
  official release pages and registry data for confirmation. Numbers recorded in an earlier
  audit are a snapshot, not an instruction.
- **No pre-release versions.** No alpha, beta, rc, nightly, canary or preview.
- **Node.js stays on a Long Term Support line.** A *Current* release is excluded until it
  actually reaches LTS.
- **Every stage passes the dependency-modernisation gate** in
  [testing-strategy §11](../testing/testing-strategy.md) — the automated gates *and* the
  manual `hbold` regression. The manual regression stays local and is never turned into CI
  fixtures.
- **Every stage travels `issue branch → DEV → QA → main`**, three Pull Requests, merge
  commits only, with a real green `Test / Build` on each. See
  [git-workflow.md](../git-workflow.md).
- **A stage that would change a durable architecture decision needs an ADR** before
  implementation, not after.
- **The next stage never starts automatically.**

---

## 10. Updating this document

Update it when a stage **completes** — move the row to Done, add the summary section, and
point the "next stage" section forward.

Do not add current version numbers. Do not add future target versions. Do not copy Linear
evidence here; link the issue instead.
