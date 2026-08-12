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
| **E** | Prisma client major upgrade — client only, no database or schema change | HOR-58 | **Done** |
| **F** | Contained single-major library upgrades, split one issue per library | HOR-59, HOR-60, HOR-61, HOR-62, HOR-63, HOR-64 | **Done** |
| **G** | Nuxt framework major migration — the pivot; includes the content-module sub-migration | Not created | **Next** |
| **H** | Tailwind CSS major migration — depends on the build tooling that arrives with Stage G | Not created | Planned |
| **I** | Stripe integration modernisation, including replacing the unmaintained module | Not created | Planned |
| **J** | Deferred and ADR-heavy items — next Prisma major, MariaDB LTS migration, PrimeVue major, router major, the Stage F libraries that remain below their current line (§9), dead-weight cleanup, advisory sweep, Python patch | Not created | Deferred |

**Order rationale:** external tooling → runtime → hygiene → dead-weight removal → contained
data layer → contained libraries → framework (the pivot) → CSS → payments → deferred and
ADR-heavy. Each earlier stage de-risks the next.

**Only Stages A, B, C, D, E and F have Linear issues.** Stages G–J are planned but **not
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

`engines.node` turns the LTS rule in §11 from documentation into something the toolchain
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
  `engines.node` is the executable form of a rule §11 had already approved.

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

Manual `hbold` regression required by §11 and by
[testing-strategy §11](../testing/testing-strategy.md), executed read-only against the
local reference database through the running application:

```txt
search "ERNE ALERT"          1 row — horse_id 1003, birthyear 1997
sire                         ABLE ALBERT
dam                          SPRINTER
known ancestors              ABWAH, POLLY PEACHUM, ikt, UNKNOWN IKT
maternal line via dam        SPRINTER -> UNKNOWN IKT
mare line                    first ancestor UNKNOWN IKT, 17 descendants
progeny                      4 foals for SPRINTER; 0 for ERNE ALERT (correct)
storehorse.status error      absent — ADR-006 compatibility layer holds
```

Probed endpoints: `search`, `search-pages`, `pedigree`, `mareline`, `progeny`,
`storehorses`, `horse`. No unknown-column error, no internal server error.

> **Correction to an earlier record.** A previous revision of this section stated that the
> manual regression could not be run because the API key required by
> `server/middleware/validateApiKey.ts` "is not defined in the local environment". **That
> statement was wrong and has been removed.** The variable is defined in the local `.env`.
> The `401` observed at the time came from probe requests issued **without** the `api-key`
> header — exactly what the middleware is designed to reject. Nothing was broken, nothing
> needed repairing, and Stage E has no precondition arising from it. Stage D passed the
> automated gate, the UI smoke test **and** the manual `hbold` regression.

### Findings raised, not acted on

- The PrimeVue **theme package is marked deprecated by its publisher**, pointing at a
  successor. Outside Stage D's scope.
- `unplugin-vue-components` and the PrimeVue auto-import resolver are **imported by
  `nuxt.config.ts` but declared in no `package.json` field**. They resolve only
  transitively, through the PrimeVue Nuxt module. The build works today and Stage D did not
  change that, but the wiring depends on packages the project never declares.
- The `/api` shared key is read in client code through a **`VITE_`-prefixed variable**, so
  the bundler inlines it into the browser bundle, and `server/middleware/validateApiKey.ts`
  compares the incoming header against that same value. The check therefore admits anyone
  who has loaded the site. Found while running this stage's manual regression. **Wholly
  pre-existing, entirely outside Stage D**, which changed no source file. It is an
  authentication-design question, not a dependency one.
  **Acted on by HOR-56**, under [ADR-007](../adr/ADR-007-api-authentication-trust-boundary.md).
- The same middleware returns its rejection as an ordinary `200` response whose **body**
  carries `statusCode: 401`. The HTTP status is never set, so a client cannot detect the
  refusal from the response status. Also pre-existing and outside this stage.
  **Removed as an inseparable consequence of HOR-56**: the response existed only on the
  invalid-shared-key path, and that path no longer exists. The wider class of handlers that
  return a status in the body instead of setting it is untouched and still open.

Each needs Sammy's decision and its own issue. Only the shared-key finding was acted on,
by HOR-56.

---

## 8. Completed — Stage E (HOR-58)

The Prisma client crossed one major. **Two declarations changed and nothing else** — the
schema, the reference database and the compatibility layer that sits between them were all
left exactly as they were.

### What changed

- `package.json` → `dependencies`, the `prisma` and `@prisma/client` ranges.
- `pnpm-lock.yaml`, regenerated by `pnpm add`.

That is the complete change set: **two versioned files, two dependency lines**. No source,
test, configuration, workflow, schema or asset file was touched.

### Why

Stage E is the *contained* data-layer move — the client major that can be crossed without a
driver adapter, without a generator change and without touching the database. That is what
makes it reviewable on its own, and what lets it land ahead of the framework pivot rather
than inside it.

The **next** Prisma major was deliberately not the target. It moves the generated client out
of `node_modules` and so breaks the `node-linker=hoisted` premise recorded in `.npmrc`. That
crossing is **Stage J** — deferred and ADR-gated. The major adopted here keeps the
`prisma-client-js` generator and needs no driver adapter, so the premise stays intact.

Exact versions are not recorded here; they live in `package.json`. The target was
re-validated from primary sources at stage start as §11 requires, and the current → target
justification and the full breaking-change classification are HOR-58's evidence.

### The audit expectation this stage closed by evidence

The HOR-48 audit — and this document's own previous "next stage" section — anticipated a
**MySQL full-text-search preview-flag cleanup** as part of Stage E. **That configuration
does not exist in this repository.** `prisma/schema.prisma` declares no `previewFeatures`
block at all, and a repository-wide search finds no `fullTextSearch`, no `fullTextIndex` and
no `@@fulltext` outside `node_modules`, `_legacy` and the lockfile.

The sub-item is therefore **closed as a verified no-op**: nothing was removed, because
nothing was present. It is recorded rather than quietly dropped, so the gap between the
audit's expectation and the repository's reality stays traceable.

### The one breaking change that applies, and why it is latent

`Bytes` fields stop being typed as Node's `Buffer` and become `Uint8Array`. Three fields in
the schema are affected, and only **one** is reachable from application code: the breeder
notes column, read by the raw SQL in `server/api/storehorses.post.ts`. A read-only count
established that **no row currently carries a value in it**, so the serialised shape of that
endpoint's response does not change today.

The risk is therefore **latent, not active**. If that column is ever populated, the JSON
changes shape — a `Buffer` serialises to a `type`/`data` object, a `Uint8Array` to an
index-keyed one. It is recorded here because a later stage, or a future data import, will
meet it long before anyone re-reads HOR-58.

### What deliberately did not change

- **`prisma/schema.prisma` was not touched.** Proven byte-identical before and after, and
  identical again when read back from `origin/main` — same content hash, same model count,
  same field count. [ADR-003](../adr/ADR-003-prisma-schema-preservation.md) holds.
- **`hbold` was not modified in any way.** No migration was created or applied, no
  `migrate dev`, no `migrate deploy`, no `db push`, no table, column, index or relation
  change, no data deletion, no reset. Every regression query ran read-only.
- **`prisma db pull` was never run against the versioned schema**, in any form.
- **No model and no field was deleted** — least of all `storehorse.status`, which
  [ADR-006](../adr/ADR-006-storehorse-column-compatibility-layer.md) keeps in the schema
  precisely *because* it is absent from `hbold`.
- **`server/utils/storehorse-compat.ts` was re-tested, not rewritten.**
- **Neither `$queryRaw` call site was refactored**, and neither were the per-file
  `PrismaClient` instantiations. Both shapes are pre-existing and belong to no stage.
- **No ADR was created or modified.** Crossing a client major *inside* the constraints
  ADR-003 and ADR-006 already set decides nothing durable.
- No other dependency was added, removed or moved. No pre-release was introduced.

### Lockfile

Every changed entry was audited and attributed. Seven Prisma packages of the old major were
removed and eighteen added: the eight packages of the new major, plus ten transitives
reachable **only** from a configuration package the new major introduces. The arithmetic
reconciles exactly with the count pnpm reported.

Three further differences were traced upstream rather than to this repository — the declared
Node floor rises; a new *optional* TypeScript peer appears unfulfilled, TypeScript not being
a direct dependency of this project; and an optional platform dependency disappears because
the new major declares none at all. Five packages now resolve at two versions each: the
older serves the new Prisma configuration package, the newer still serves Nuxt.

The change was performed with `pnpm add`. Neither file was hand-edited.

### What was verified

Full dependency-modernisation gate,
[testing-strategy §11](../testing/testing-strategy.md):

```txt
pnpm install --frozen-lockfile        clean
Vitest node project                   pass — 3 files, 59 tests
Vitest nuxt project                   pass — 1 file, 2 tests
complete pnpm test                    pass — 4 files, 61 tests
pnpm build                            pass
git diff --check                      clean
```

`prisma validate` passed on both sides of the upgrade, and `prisma generate` regenerated the
client successfully.

Manual `hbold` regression, required by §11 and by
[testing-strategy §11](../testing/testing-strategy.md), executed read-only **before and
after** the upgrade with every counter compared:

```txt
search "ERNE ALERT"          identical — one horse, birthyear 1997
sire / dam                   identical — ABLE ALBERT / SPRINTER
pedigree                     identical node counts, four generations deep
maternal line via dam        identical — SPRINTER -> UNKNOWN IKT
mare line / family tree      identical node counts
storehorse row count         identical
storehorse.status error      absent — ADR-006 compatibility layer holds
```

The raw-SQL endpoint that reads the `Bytes` column was additionally exercised end to end
against `hbold` and answered `200` with a complete, well-formed result set.

All three promotion Pull Requests carried a **real, green `Test / Build`** triggered by the
`pull_request` event.

### A promotion mechanic this stage uncovered

Promotion to `main` was blocked — and so, symmetrically, was the back-propagation that fixes
it — because `main` held a release commit `QA` and `DEV` had never received. The route out
is the one [git-workflow.md](../git-workflow.md) already mandates: a branch and a Pull
Request, never a direct or fast-forward alignment. The mechanic, its trigger and the reason
GitHub's own "update branch" button cannot resolve it are recorded in
[git-workflow.md §12](../git-workflow.md), which owns Git mechanics.

### Release Please

Release Please ran on `main` after the change landed and produced **no release Pull
Request** — the change was a `chore`, which is not user-facing. That is the expected
outcome, not a failure. No tag and no release were created manually.

---

## 9. Completed — Stage F (HOR-59, HOR-60, HOR-61, HOR-62, HOR-63, HOR-64)

Six contained library majors, **one Linear issue, one branch, one commit series and one
three-Pull-Request chain each**, executed strictly one at a time. No Pull Request in the
stage carried two libraries, and no library was started before the previous one was closed.

### What changed

| Library | Issue | Outcome |
|---|---|---|
| `primeicons` | HOR-59 | **Removed** |
| `dotenv` | HOR-60 | **Removed** |
| `uuid` | HOR-61 | One major crossed |
| `nodemailer` | HOR-62 | One major crossed |
| `bcrypt` | HOR-63 | One major crossed |
| `@heroicons/vue` | HOR-64 | One major crossed |

Four of the six changed only `package.json` and `pnpm-lock.yaml`. The two exceptions are
`dotenv`, which took its single consumer with it, and `@heroicons/vue`, whose major renamed
the package entry points and therefore reached fifteen `.vue` files — by far the largest
source diff of the stage, and the reason it was sequenced last.

### Why

Stage F is the *contained library* band: majors that can each be crossed, reviewed and
reverted on their own, ahead of the framework pivot rather than tangled inside it. Splitting
one issue per library is what makes that true. A single "upgrade the dependencies" Pull
Request would have been unreviewable, and a regression in it unattributable.

### Two libraries were removed, not upgraded

This is the stage's durable lesson, and the reason it cannot be summarised as *six
upgrades*.

**`primeicons` was removed.** Its next major is not a technical breaking change at all — it
relicenses the package from MIT to a commercial licence. Sammy decided against adopting that
licence, and equally against pinning the old major merely to retain MIT. The dependency was
then **exhaustively proven unused** — not by a literal name search, which proves nothing, but
across import paths, CSS entry points, build configuration and rendered output — and removed.

**`dotenv` was removed as a redundant direct dependency.** Nuxt already loads `.env` through
`c12`, so the direct dependency and its explicit configuration call duplicated a mechanism the
framework provides. The framework's internal mechanism was deliberately **not** touched;
only the redundant direct declaration and its single consumer were.

In both cases the honest answer to "which major should we adopt?" turned out to be "none —
this dependency should not be here". A modernisation stage that cannot reach that conclusion
will keep upgrading things the project does not need.

### The deferred tail

**Two of the six libraries remain below their current line.** Each crossed exactly one
major, as the stage requires, and each still has further majors above it. Those crossings
were deliberately not chased inside a contained stage: crossing two majors at once destroys
the attribution that makes this band reviewable. They belong to **Stage J**, deferred and
re-validated when that stage starts.

The other two upgraded libraries sit on their current stable line, so they carry no tail.

Exact versions are not recorded here; they live in `package.json`. Every target was
re-validated from primary sources at the start of its own issue, as §11 requires.

### What deliberately did not change

- **Node.js, pnpm, Nuxt and Vue were not moved** to accommodate any of the six. A library
  that had required one of them to move would have stopped its issue and reported the
  incompatibility instead.
- **No two libraries were ever in flight together.** One issue `In Progress` at a time, and
  a blocked library stopped the stage rather than being skipped for the next one — which is
  exactly what happened when the `primeicons` licence change surfaced.
- **No lockfile was hand-edited**, and no global update was run. Every lockfile diff was
  audited entry by entry and attributed to the one library being changed; a diff that had
  touched a second direct dependency would have stopped the issue.
- **No ADR was created or modified.** Contained library majors decide nothing durable.
- **`docs/modernisation/modernisation-plan.md` was not touched by any of the six issues.**
  Each explicitly excluded it, so that the stage summary could be written once, from the
  finished stage, rather than six times from partial states. This section is that write-up.
- **Pre-existing defects met along the way were recorded, not repaired.** The clearest case
  is a pair of swapped button icons found during the icon upgrade: fixing it inside a
  dependency issue would have made that issue's diff impossible to review *as an upgrade*.
  It is filed separately.

### What was verified

Every issue ran the full dependency-modernisation gate in
[testing-strategy §11](../testing/testing-strategy.md) — `pnpm install --frozen-lockfile`,
both Vitest projects, the complete `pnpm test` with **no reduction** in file or test count
against its own pre-change baseline, `pnpm build`, and `git diff --check`.

Every issue also ran the **manual `hbold` regression read-only, both before and after**, and
compared the two captures rather than merely observing that the second one worked. The
comparison was byte-level: identical response bodies, identical aggregate digest. The
`storehorse.status` error did not return in any of the six, so
[ADR-006](../adr/ADR-006-storehorse-column-compatibility-layer.md) compatibility held
throughout. CI never connected to `hbold`.

The icon upgrade added one gate the others did not need, because it is the only library in
the stage whose failure mode is **visual rather than functional**: the affected routes were
rendered from the production build and compared against the same routes rendered from a
rebuilt pre-change state. Icon counts matched exactly, and no component was left unresolved.
A build-size increase was **fully attributed** rather than accepted — it is the server bundle
vendoring the dependency whole, which Nitro does without tree-shaking, while the tree-shaken
browser payload barely moved.

Each of the eighteen Pull Requests carried a real green `Test / Build` on its own
`pull_request` event, and each change was confirmed present in `main` **by ancestry**, never
by SHA equality.

### Release Please

Release Please produced **no release Pull Request** for any of the six, and no tag was
created. All six landed as `chore` commits, which are not user-facing. That is the expected
outcome — six consecutive times — not a failure. No tag and no release were created manually.

---

## 10. Next stage — Stage G

**Stage G is next and has not been started.** Its Linear issue does **not** exist.

Scope, from the HOR-48 audit: the **Nuxt framework major migration** — the pivot of this
plan, including the content-module sub-migration that travels with it. Every earlier stage
exists to de-risk this one.

Unlike Stage F, it is **not** a contained band. It moves the framework the entire
application runs on, so its blast radius is the whole repository rather than one dependency
line, and its ADR impact must be assessed before implementation rather than assumed to be
none.

Target versions are deliberately not recorded here and are re-validated when the stage
starts (§2). The numbers the audit captured are a snapshot of its own date.

Its gate is the ordinary one: the automated gates *and* the manual `hbold` regression.

Creating the Stage G issue **requires Sammy's authorisation**. No agent starts it
automatically, and finishing Stage F is not authorisation to begin (§11).

---

## 11. Rules

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

## 12. Updating this document

Update it when a stage **completes** — move the row to Done, add the summary section, and
point the "next stage" section forward.

Do not add current version numbers. Do not add future target versions. Do not copy Linear
evidence here; link the issue instead.
