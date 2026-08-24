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
| **G** | Nuxt framework major migration — the pivot. Its content-module sub-migration was resolved by removal in HOR-67 and was not part of this stage (§10) | HOR-67, HOR-68 | **Done** |
| **H** | Tailwind CSS major migration — depends on the build tooling that arrived with Stage G | HOR-69 | **Done** |
| **I** | Stripe integration modernisation, including replacing the unmaintained module | HOR-72 | **Done** |
| **J** | Deferred and ADR-heavy items — next Prisma major, MariaDB LTS migration, PrimeVue major, the Stage F libraries that remain below their current line (§9), dead-weight cleanup, advisory sweep, Python patch | HOR-83 | **Done** |

**Order rationale:** external tooling → runtime → hygiene → dead-weight removal → contained
data layer → contained libraries → framework (the pivot) → CSS → payments → deferred and
ADR-heavy. Each earlier stage de-risks the next.

**Every stage now has a Linear issue.** Stage J was authorised by Sammy and created on
2026-08-17 as the HOR-83 umbrella (§13). Creating a stage issue requires Sammy's
authorisation.

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

`engines.node` turns the LTS rule in §14 from documentation into something the toolchain
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
  `engines.node` is the executable form of a rule §14 had already approved.

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

Manual `hbold` regression required by §14 and by
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
  **Closed by HOR-96 on 2026-08-22**: every remaining handler that signalled failure by
  returning a status in the body now throws, so no endpoint answers `200` with a failed
  result. The body still carries `statusCode` for the existing callers — what changed is
  that the transport status is now the truth.

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
re-validated from primary sources at stage start as §14 requires, and the current → target
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

Manual `hbold` regression, required by §14 and by
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
re-validated from primary sources at the start of its own issue, as §14 requires.

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

## 10. Completed — Stage G (HOR-67, HOR-68)

The pivot. Every earlier stage existed to de-risk this one: the **Nuxt framework major
migration**, crossed in a single issue after its content-module gate was closed separately
ahead of it.

### What changed

| Package | Outcome |
|---|---|
| `nuxt` | One major crossed — the framework the whole application runs on |
| `vue-router` | One major crossed, required by the Nuxt target |
| `unhead` | One major crossed **transitively**; never declared as a direct dependency |

The build toolchain moved underneath the framework rather than by decision: the Vite major
and the renamed Nitro server package arrived as part of the Nuxt release. Vue itself did
**not** move.

**The source diff is three lines across two files.** Everything else is `package.json` and
`pnpm-lock.yaml`. For a framework major that is the point, not luck — see below.

### The content-module sub-migration was closed first — HOR-67

The audit expected a content-module sub-migration to travel with Stage G. **It does not.**
It was resolved ahead of the stage, by removal rather than migration, in HOR-67.

`@nuxt/content` v2 is unmaintained on the v3 line, and v3 requires SQLite, `db0`, content
collections, a `content.config.ts` and connector infrastructure. A four-layer audit — source,
dependency graph, build output and running routes — confirmed the module served nothing: no
`content/` directory, no markdown or MDC outside `docs/`, no `content.config.ts`, no consumer
anywhere in the application, and a direct dependency of this package and of nothing else. It
was removed rather than migrated, because none of that infrastructure was worth introducing
to serve zero documents.

Three of its four durable consequences held exactly as recorded, and HOR-68 settled the
fourth. The sub-migration stayed out of Stage G's scope; only one Unhead line remained to
reason about; and ADR-007 needed no amendment, because `isModuleOwnedApiPath` reads a
framework convention rather than a `@nuxt/content` exception. The outstanding item —
`components/StripePeyment.vue` importing `useHead` from a bare `"unhead"` specifier it did
not declare, resolved only through pnpm hoisting — was Stage G's to settle, and is settled
below.

The removal passed the ordinary gate, including the manual read-only `hbold` regression
captured before and after. The two captures differed in exactly two lines: every page became
~1.3 kB smaller, and `/api/_content/query` began answering 404 instead of 200.

### Why the framework major was still a small diff

Unlike Stage F, Stage G is **not** a contained band. It moves the framework the entire
application runs on, so its blast radius is the whole repository rather than one dependency
line. What kept the diff to three source lines was not luck; it was the decision described
below, plus an audit that ran **before** the version was changed rather than after the build
broke.

That audit classified every use of a changed API against the repository instead of against
release notes. The result: no `definePageMeta`, no `useState`, no `__NUXT__` or payload
access, and no deep mutation of `useFetch` data anywhere — so the Nuxt 4 change making that
data a shared shallow ref had nothing in this codebase to break. The single non-composable
router import in the application keeps its signature across the router major. The one
build-time constant the audit initially missed was found only because the sweep was re-run
**without** an extension filter, which is the durable lesson: a breaking-change sweep scoped
by file extension is not a sweep.

### The one decision it required — ADR-008

The new framework major relocates application code by default. Adopting that default would
have moved nearly every directory in the repository in the same change that swapped the
framework.

**It was refused, through supported configuration rather than a compatibility shim**, and
the rule was made general in
[ADR-008](../adr/ADR-008-flat-repository-structure-during-framework-majors.md): *a framework
major migration never doubles as a repository directory reorganisation.*

The reason is verification, not preference. A framework major is proven safe by comparing
behaviour before and after, and that comparison is only meaningful when the file paths on
both sides match. Move every directory at the same moment and a diff of hundreds of renames
hides the handful of lines that actually changed the framework — and any regression becomes
unattributable. Adopting the new layout remains legitimate work; it is **separate** work,
with no version change in it.

### The accidental dependency was removed, not declared

`components/StripePeyment.vue` imported `useHead` from a bare `"unhead"` specifier the
project never declared, which resolved only because pnpm hoists. The Unhead major made that
line a decision rather than an oversight.

**It was deleted.** `useHead` is a framework auto-import, so the correct number of direct
Unhead dependencies is zero. Declaring the package to make the existing import legitimate
would have written an accident into `package.json` permanently. The lockfile was checked
afterwards to confirm Unhead appears only as a transitive resolution and never in the direct
dependency block.

### What deliberately did not change

- **Vue was not moved.** A framework major is enough for one issue.
- **No database, schema, migration or Prisma change of any kind.**
  [ADR-003](../adr/ADR-003-prisma-schema-preservation.md) and
  [ADR-006](../adr/ADR-006-storehorse-column-compatibility-layer.md) were untouched and the
  compatibility layer was verified still to hold.
- **The repository structure stayed flat** — the whole point of ADR-008.
- **The test tooling was not bumped.** The audit expected it might need to be; the full suite
  passed unchanged, so it was left alone. A gate that passes is not an invitation to upgrade
  something else.
- **`nuxt.config.ts` acquired configuration, not workarounds.** No compatibility flag, no
  legacy mode, no pinned sub-dependency.
- **Pre-existing debt met along the way was recorded, not repaired** — including a build-time
  constant in a composable with unrelated latent problems around it. Fixing them inside a
  framework migration would have made the diff impossible to review *as a migration*.
- **The lockfile was never hand-edited**, and every entry in its diff was attributed.

### What was verified

The full dependency-modernisation gate in
[testing-strategy §11](../testing/testing-strategy.md), plus the manual `hbold` regression
read-only **before and after**, compared capture against capture rather than merely observed
to work.

The test suite passed with **no reduction in file or test count** against its own pre-change
baseline, and the production build succeeded on the new framework, builder and server.

The runtime comparison is the interesting one. Every data-layer assertion is **identical**
across the major: the ADR-007 access boundary still refuses what it must, and the pedigree,
maternal-line, progeny and search responses match node for node. The `storehorse.status`
error did not return, so ADR-006 compatibility held.

**One difference appeared, and it was chased to a cause rather than accepted.** Every
server-rendered page came back dramatically smaller. That looks exactly like server rendering
having silently broken — so it was investigated as though it had: the markup was counted,
the headings, navigation and images were confirmed present, and the linked stylesheet was
fetched and measured. The framework major changed **how CSS is delivered**, from inlined in
the server-rendered HTML to an external stylesheet, and the missing bytes are accounted for
almost exactly by the sheet now served separately. No content was lost.

It is recorded here because it is benign but **not invisible**: an external stylesheet is a
render-blocking request on first paint where inlined CSS was not. That is a delivery
characteristic to be aware of, not a regression, and tuning it was out of this issue's scope.

### Release Please

The change landed as a `chore`, which is not user-facing, so **no release Pull Request and no
tag** were produced. That is the expected outcome, not a failure. No tag or release was
created manually.

---

## 11. Completed — Stage H (HOR-69)

The **Tailwind CSS major migration**, sequenced after the framework because it depends on the
build tooling the framework major brought with it.

### What changed

| Package | Outcome |
|---|---|
| `tailwindcss` | One major crossed |
| `@nuxtjs/tailwindcss` | **Removed.** Cannot resolve the new major, and its stable line still depends on a Nuxt 3 kit |
| `@tailwindcss/vite` | **Added.** Tailwind's own first-party integration, the one its Nuxt installation guide prescribes |
| `autoprefixer` | **Removed as a direct dependency.** Nuxt's Vite builder already depends on it and on `cssnano`, and applies both by default |

`tailwind.config.js` was deleted — the new major configures in CSS and detects its own source
files, and the file was the untouched generator stub. The `postcss` block left `nuxt.config.ts`
for the same reason. Both decisions are recorded in
[ADR-009](../adr/ADR-009-tailwind-vite-plugin-and-v3-compatibility-layer.md).

### Why the integration had to change, and why it cost nothing

There was no module-versus-plugin choice to make. The module's stable line pins the previous
Tailwind major and cannot resolve the new one, so staying on the module meant staying on
Tailwind 3; and its only newer artefacts are pre-releases, which §14 forbids.

What the audit had to establish was the **cost of leaving it**, and the cost was nil. The
project used no module option, no config exposure, no editor support, no module hook and no
config import. The `tailwindcss: {}` entry in `nuxt.config.ts` was the PostCSS plugin key, not
module configuration. Removing a wrapper that wrapped nothing is a reduction in dependency
surface, not a migration.

### The real risk was visual, and it was not in the upgrade guide

This project defines **no design tokens of its own**. It renders entirely on the framework's
defaults, so it inherits every default change in full. A CSS major can therefore restyle every
page while the test suite passes and the build stays green — which is exactly why a green gate
was never going to be sufficient evidence here.

Four base-style changes were found by reading the upgrade guide. Two more were found only by
**measuring the built stylesheet against the previous major's published palette**:

- The **default sans font stack** changed in a **patch** release of the new major, not between
  majors. The upgrade guide does not mention it — correctly, because it did not happen there.
  It was found by unpacking each published tarball in turn and reading the theme file.
- The **entire colour palette** was re-derived in OKLCH. Of the 43 palette tokens this
  application uses, **35 resolve to a different colour**, 15 of them visibly (CIE76 ΔE ≥ 5,
  worst case 16.08). The neutrals barely move and the dominant brand colours are effectively
  unchanged, so the shift concentrates in accents — payment and destructive buttons, alert
  states, and focus rings.

**The palette change was missed by this issue's own breaking-change matrix.** It surfaced at
verification, not at planning. That is the durable lesson and it is stronger than Stage G's:
Stage G learned that a sweep scoped by file extension is not a sweep; Stage H learned that a
breaking-change matrix built from release notes is not a breaking-change analysis. **Measure
the artefact the build actually emits.**

### The one decision it required — ADR-009

Two legitimate options existed: adopt the new defaults, or hold the previous appearance. Both
were put to Sammy with the measurement in hand, and **neither was taken by an agent**.

He chose to hold the existing appearance, and framed why: Stage H is a build-tooling
migration, not a visual redesign, and a PRE/POST comparison is only meaningful if any
difference it shows is a real regression rather than a restyle bundled into an upgrade. That
is the same reasoning [ADR-008](../adr/ADR-008-flat-repository-structure-during-framework-majors.md)
applied to directory moves inside a framework major.

`assets/css/tailwind.css` therefore carried a **temporary compatibility layer**: the four base
styles plus the 35 moved palette tokens, every value measured rather than transcribed.
[ADR-009](../adr/ADR-009-tailwind-vite-plugin-and-v3-compatibility-layer.md) recorded it as a
compatibility layer and **explicitly not as this project's visual identity**. It was expected to
be removed, and it has been — see *Follow-up outside the stage* below.

**Adopting the new font stack and the OKLCH palette is independent visual work.** It needs a
side-by-side comparison and a conscious decision, it was out of Stage H's scope, and **its issue
was deliberately not created here** — recording the finding is not authorisation to act on it
(§14). That issue was opened separately, as HOR-70.

### What deliberately did not change

- **The appearance.** By decision, and verified rather than assumed.
- **No database, schema, migration or Prisma change of any kind.**
  [ADR-003](../adr/ADR-003-prisma-schema-preservation.md) and
  [ADR-006](../adr/ADR-006-storehorse-column-compatibility-layer.md) untouched, and the
  compatibility layer verified still to hold.
- **No `server/api`, access-policy, authentication or middleware change.** ADR-007 untouched.
- **The repository structure stayed flat** — ADR-008 still binding through a second major.
- **No browser automation framework was installed.** Verification is declaration-level, and
  §"What was verified" says so plainly rather than implying screenshots exist.
- **`assets/css/main.css` remains orphaned and untouched.** It is dead code and deleting it is
  a cleanup, not a migration.
- **The renamed utilities were rewritten at the call site, not aliased back into existence.**
  A shim would have left the source saying names the framework no longer agrees with.
- **The lockfile was never hand-edited.**

### What was verified

The full dependency-modernisation gate in
[testing-strategy §11](../testing/testing-strategy.md), plus the manual read-only `hbold`
regression captured **before and after** and compared capture against capture.

Because the risk was visual and the gate is not, the comparison was extended:

- **Four targeted probes** against the built stylesheet, one per changed base style, located by
  byte offset so that override order — which wins in CSS — is proven rather than assumed.
- **All 43 palette tokens** converted from the emitted stylesheet back to sRGB and compared
  against the previous major's published palette. Result after the compatibility layer:
  **0 tokens differ**. 35 held explicitly, 8 already identical.
- **14 server-rendered routes** captured before and after and compared **class token by class
  token**, with the utility renames normalised. Result: **0 unexplained differences**.
- **Every class token in all 67 components and pages**, same normalisation, DEV against the
  branch. Result: **0 unexplained differences**.

Stage G's CSS-delivery finding shaped this: the stylesheet is linked rather than inlined, so
every one of these checks fetches and measures the sheet instead of diffing the served HTML.

**What this evidence is not.** It is a declaration-level and markup-level comparison, not a
pixel comparison. It proves that the same classes reach the same elements and that every
declaration those classes resolve to is unchanged. It does not photograph the result. Installing
a browser automation framework to do that was not authorised for this stage, and it is recorded
as a limitation rather than papered over.

### Release Please

The change landed as a `chore`, which is not user-facing, so **no release Pull Request and no
tag** were produced. That is the expected outcome, not a failure. No tag or release was created
manually.

### Follow-up outside the stage — the compatibility layer is withdrawn (HOR-70)

**Stage H is unchanged and stays Done.** This note records what happened to the layer it
created, because leaving the paragraphs above as the last word would describe outstanding debt
that no longer exists.

HOR-70 is not a modernisation stage. It is the visual issue ADR-009 foresaw: it compiled the
two states from the same source with the project's own compiler and rendered them side by side
per default, Sammy reviewed the comparison, and he chose **Tailwind 4 native for every default**
— font stack, the full OKLCH palette, `currentColor` borders, the native placeholder, and the
browser's own button cursor.

The compatibility layer was therefore removed. `assets/css/tailwind.css` is now its header
comment and a single `@import "tailwindcss";`. No component, route or test changed, and no
utility reverted to a Tailwind 3 name — Decision 4 of ADR-009 still holds.

**The project's official appearance is now Tailwind 4 native**, not "Tailwind 4 engine plus a
Tailwind 3 compatibility layer". A difference against the old Tailwind 3 appearance is the
approved design, not a regression. The full record is in
[ADR-009 § Review outcome](../adr/ADR-009-tailwind-vite-plugin-and-v3-compatibility-layer.md#review-outcome--2026-08-13-hor-70).

The rule that made the layer necessary — **a version upgrade does not change the design** — is
untouched and still binding on every future stage. HOR-70 is what that rule prescribes, not an
exception to it: the design moved because Sammy moved it, deliberately, in an issue of its own.

---

## 12. Completed — Stage I (HOR-72)

### What changed

```txt
nuxt-stripe-module   3.2.0 -> removed
stripe              17.7.0 -> 22.5.0
@stripe/stripe-js   4.10.0 -> 9.13.0
```

Plus the payment defect the audit found, corrected in the same issue because it determines
what Stripe is actually charged: **the amount now comes from the server.**

### Why the version work was the smaller half

The module was unmaintained and had **no runtime consumer**. Its only trace in the
application was a `types` entry in `server/tsconfig.json` — the publishable key the payment
component reads comes from an explicit `runtimeConfig` entry in `nuxt.config.ts`, not from
the module. Removing it also removed the **second major of `@stripe/stripe-js`** it dragged
in: the tree carried 1.54.2 alongside the declared 4.10.0.

`pnpm why` is the measure that settled this. The directories that remain under
`node_modules/.pnpm` are content-addressable store entries, not resolutions, and reading
them as dependencies would have reported a problem that does not exist.

### The defect that made this stage more than a version bump — ADR-010

`server/api/create-payment-intent.post.ts` read `amount` and `currency` from the request
body and passed both to Stripe unchecked. The price itself lived in the browser:
`components/StripePeyment.vue` carried its own price table, stripped the `€`, multiplied by
100 and posted the result. Every number in that chain was editable by whoever was running
the page.

The route is **Public** in [ADR-007](../adr/ADR-007-api-authentication-trust-boundary.md),
correctly — an anonymous visitor has to be able to start a purchase. ADR-007 had already
recorded this handler as a finding and states that defects *inside* a handler are fixed by
their own issue rather than by moving the access classification. HOR-72 is that issue, and
ADR-007 needed no amendment.

The correction is structural, not a stricter check:
[ADR-010](../adr/ADR-010-server-side-payment-amount-authority.md) makes the server the only
source of a price. The client sends `{ tier, frequency }`; `server/utils/premiumPlans.ts`
prices it. An `amount` sent by a caller is **ignored rather than sanitised**, because a
value that is never read cannot be smuggled past a check.

Three further faults in the same handler were fixed with it, each load-bearing for money:

- **`payment_method: 'pm_card_visa'`** — a Stripe *test* token, which would have rejected
  every real card the moment the deployment used a live key.
- **The always-200 envelope** — every outcome, including failure, answered HTTP 200 with the
  real result hidden in a JSON string. It now returns 400, 422 and 500 for real.
- **The whole error object was logged.** `StripeError.raw` carries the full API response,
  which for a `PaymentIntent` includes its client secret. Only `type`, `code` and
  `requestId` are logged now.

The Stripe API version is **pinned**. The SDK types `apiVersion` as a string literal equal
to the version it ships against, so the next major that moves it **fails the build at that
line** instead of quietly changing how a charge is constructed. That property cost nothing
to adopt and is the reason this stage did not need a version-compatibility investigation of
its own.

### What deliberately did not change

- **The one-time `PaymentIntent` model.** No Customer, no Subscription, no Checkout
  Session, no webhook, no persistence. The pricing UI speaks of Monthly and Annually
  subscriptions while nothing recurring exists and nothing records entitlement — a real
  contradiction, tracked as **HOR-73**, requiring a product decision, its own ADR and
  almost certainly a schema change. Resolving it by inference inside a dependency stage is
  exactly what these stages must not do.
- **The price displayed** by `components/payment.vue` and `components/PaymentCard.vue`.
  Those tables are display duplication that predates this stage. The third copy — the one
  that *computed the charge* — is the one that was removed.
- **No idempotency key.** Real idempotency needs a client-supplied key; a server-generated
  one protects nothing. Recorded in ADR-010 as a known limitation rather than an oversight.
- **No database or schema change.** ADR-003 was not approached.
- Payments stay **card-only**. Enabling further payment methods is a product decision.

### What was verified

The full dependency-modernisation gate in
[testing-strategy §11](../testing/testing-strategy.md), plus verification proportionate to a
commercial path.

- `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`. Tests went **62 → 100**; the
  38 new ones are the catalogue and the resolver, driven RED → GREEN.
- **Manual `hbold` regression**, read-only, against the built server: ERNE ALERT found
  (`horse_id` 1003); its pedigree opened with 13 distinct ancestors; **sire ABLE ALBERT and
  dam SPRINTER render**; maternal line returned 30 names; and the `storehorse.status` error
  did not return — the ADR-006 compatibility path ran clean.
- **Key handling audited by structure, never by value.** `SECRET_PRESENT=true`,
  `PUBLISHABLE_PRESENT=true`, both `TEST` mode. The built client bundle was scanned across
  263 files: **0 occurrences** of a secret key.
- **The trust boundary was proven end to end, not argued.** A request carrying
  `{tier: 1, frequency: "monthly", amount: 1, currency: "usd", planName: "free"}` produced a
  charge of **4900 EUR minor units, Pro Access**. Read back from Stripe's own records, the
  intents show the server's amounts, `payment_method_types: ["card"]`, plan metadata, and
  `livemode=false` throughout.
- Refusals were exercised against the running route: 400 for a malformed tier, 422 for an
  uncatalogued tier, an unknown frequency, and the capitalised `"Monthly"` the component
  used to default to.

**All Stripe interaction was TEST mode.** No live key was used, no real card, no live
charge, no refund. Client secrets were never logged or printed.

**What this evidence is not.** No card was typed into Stripe Elements in a browser, so the
final `confirmCardPayment` leg is covered by the unchanged client code and by Stripe's own
test-mode acceptance of the intents, not by an end-to-end browser run. Said plainly rather
than left to be assumed.

**One check could not be run.** `.env.example` is unreadable in this environment by
permission policy. Stage I introduces **no new environment variable** — `NUXT_STRIPE_SECRET_KEY`
and `NUXT_STRIPE_PUBLIC_KEY` both predate it and are unchanged — so no edit is required, but
the file's contents were not inspected and are not claimed to have been.

### Release Please

Unlike Stages G and H, this stage carries a `fix:` commit, so a release Pull Request **is**
expected. It passes `Test / Build` like any other change and is **not merged without Sammy's
authorisation**.

---

## 13. Completed — Stage J (HOR-83)

**Stage J started on 2026-08-17**, authorised by Sammy after the v1.3.1 release cycle
closed. **HOR-83** (US-088) is the stage umbrella; it owns the refreshed audit matrix, the
re-validated target versions and the staged execution order. One child issue exists per
library or concern (US-089–US-098); Linear owns their detailed execution record.

Scope, from the HOR-48 audit confirmed by the 2026-08-17 re-validation: the **deferred and
ADR-heavy tail** — the dead-weight removals (html2pdf/html2pdf.js, quill/vue3-quill, the
legacy polyfill band), nodemailer, uuid, the PrimeVue major, the crypto-js replacement,
the next Prisma major (**ADR required**), the MariaDB LTS migration (**ADR required**;
Sammy chooses the target), and the final advisory and minor/patch sweep. The historical
"router major" item was dropped: vue-router 5 is already the current line.

Progress:

- **US-089 (HOR-84) — complete.** nodemailer 7.0.13 → 9.0.5 in `main`.
- **US-090 (HOR-85) — complete.** Removed the unused `html2pdf` 0.0.11 and `html2pdf.js`
  0.10.3 (zero consumers ever, per full-tree and Git-history audit). Their transitive
  `jspdf` chain carried 2 critical, 7 high and 3 moderate advisories on 2026-08-18; all
  disappeared with the removal. The live export path — native `window.print()` plus the
  `html-docx-js-typescript`/`file-saver` DOCX export — never depended on them.
- **US-091 (HOR-86) — complete.** Removed the unused `quill` 2.0.3 and `vue3-quill` 0.3.1
  (zero consumers ever — dead on arrival in the baseline commit, per full-tree,
  generated-output and Git-history audit). Their advisories (one moderate, one low)
  disappeared with the removal; the lockfile lost exactly the 31-entry quill closure and
  nothing else. The rich-text **capability** was never Quill-backed: the write path is a
  plain input/textarea, the read path renders stored HTML, and no persisted content holds
  Quill Delta JSON or `ql-` classes, so no business capability was lost.
- **US-092 (HOR-87) — complete.** Removed the legacy runtime polyfill layer: `node-fetch`
  3.3.2, `core-js` 3.49.0 and `regenerator-runtime` 0.14.1. Each was audited and proven
  independently rather than as a band. Node 24 supplies `fetch`, `Headers`, `Request`,
  `Response`, `FormData`, `Blob` and `AbortController` natively, and no application file
  ever imported `node-fetch`; no Babel `preset-env` pipeline exists, so nothing consumed
  `core-js` (`core-js-compat` was absent and `@babel/core` is present only for the Vue
  JSX and TypeScript syntax plugins); and the emitted client bundles proved
  `regenerator-runtime` obsolete — before removal exactly one chunk contained
  `regeneratorRuntime`, consisting solely of the polyfill registering itself, with zero
  chunks calling it and zero `_asyncToGenerator`/`asyncGeneratorStep` transforms, because
  esbuild emits native `async`/`await` for the current targets. The only source change was
  deleting the client plugin that loaded the polyfill and its `nuxt.config.ts`
  registration; no wrapper, shim or replacement was introduced. The lockfile lost exactly
  the eight-entry closure of the three packages. **`node-fetch` 2.7.0 remains in the tree
  as a legitimate transitive of the Nuxt build toolchain** (`@mapbox/node-pre-gyp` ←
  `@vercel/nft` ← `nitropack` ← `nuxt`), and Nitro's own `node-fetch-native` is unrelated
  to the removed package — neither is ours to remove. No advisory was fixed or introduced.
- **US-093 (HOR-88) — complete.** `uuid` 12.0.1 → 14.0.2 (the matrix named 14.0.1;
  14.0.2 was the highest stable release on the current major when the child started). The
  package has exactly one consumer, `server/api/uploadImages.post.ts`, which calls `v4()`
  with no arguments and concatenates the result with a file extension, so no application
  source changed. The UUID produced by `server/utils/accessToken.ts` comes from
  `randomUUID` in `node:crypto`, not from this package, which keeps the authentication
  `jti` outside the upgrade's blast radius entirely. The reachable breaking change was
  v13's export-map inversion: uuid 12 exposed a `browser` condition with the Node build
  under `default`, while uuid 14 exposes a `node` condition with the browser build under
  `default`, moving the resolved file from `dist/` to `dist-node/`. That resolution was
  proven against the real build artefact rather than assumed — Nitro traced only
  `dist-node/`, with `dist/` absent, the exact mirror of the HOR-61 evidence for uuid 12.
  v14's global-`crypto` requirement is satisfied by Node 24, its `engines` floor is below
  the pinned `^24.19.0`, its TypeScript floor is moot because TypeScript is absent from
  the dependency tree, and its new `RangeError` on an invalid buffer offset is unreachable
  from a call site that passes no buffer and uses none of `v3()`, `v5()` or `v6()`.
  **Persisted identifiers were neither reformatted nor reinterpreted:** generated values
  remain canonical lowercase 36-character UUIDv4 strings, and every consumer of the stored
  `gallery.photo_id` concatenates it into an image URL — nothing parses, validates or
  version-checks it — so no schema change, migration or data rewrite was involved. The
  generated-identifier contract had no test protecting it, so one was added beside the
  consumer. No advisory was fixed or introduced; the `uuid` path carries none.
- **US-095 (HOR-90) — complete.** Removed `crypto-js` 4.2.0 outright. The audit had named
  this item a *replacement*; the child proved there was nothing to replace. The library's
  entire responsibility was AES-obfuscating numeric `horse_id` and breeder `id` values
  inside URL path segments, and the passphrase reached it as
  `import.meta.env.VITE_ENCRYPT_KEY` — a `VITE_`-prefixed variable that Vite **statically
  inlines into the public browser bundle**. The key therefore travelled to every visitor
  alongside the ciphertext it was meant to protect, which is the same defect class HOR-56
  removed for the shared api-key: **security theatre, not a security boundary.** The
  ciphertext was not a stable identifier either — crypto-js passphrase mode derives its key
  with EVP_BytesToKey (MD5) over a fresh random 8-byte salt per call and emits the OpenSSL
  `Salted__` envelope, so the same `horse_id` produced a different URL on every render.
  Sammy resolved the persisted-data gate with verified product context: **the application
  has never been deployed publicly or hosted outside a local machine**, so the encrypted
  routes never formed a public URL contract — no production users, bookmarks, search-engine
  indexes or external backlinks, no persisted ciphertext, and no business data keyed to the
  format. Nothing therefore required compatibility, and **no legacy decoder, redirect,
  dual-format or temporary compatibility layer was built.** The canonical URL contract is
  now the **plain numeric public id** — `/pedigree/erne-alert/1003`. Thirteen URL producers
  dropped their `encryptData(...)` call and now emit the id directly; nine route consumers
  replaced `decryptNumber(...)` with a new `parseRouteId`, which validates the caller-
  controlled route parameter against a canonical positive decimal (`/^[1-9][0-9]*$/`) plus
  `Number.isSafeInteger` rather than coercing it — closing the `parseInt("12abc") === 12`
  hole the old decoder's `parseInt` fallback carried. **Its invalid sentinel is still `-1`,
  byte-identical to what `decryptNumber` returned on any failure**, so every page kept its
  existing not-found handling and no consumer logic changed. `encryptData`, `decryptNumber`
  and the `CryptoJS` import are gone; the now-dead `VITE_ENCRYPT_KEY` entry was removed from
  `runtimeConfig` after confirming no server code ever read it. **No replacement crypto or
  obfuscation dependency was introduced** — not Web Crypto, not base64url. The emitted
  artefacts prove the removal: zero occurrences of `VITE_ENCRYPT_KEY`, `CryptoJS`,
  `Salted__`, `encryptData` or `decryptNumber` across the 261 files of `.output/public` and
  across `.output/server`, and the lockfile lost the whole `crypto-js` entry. Plain numeric
  ids are **identifiers, not authorisation** — access control stays at the API and auth
  boundary, where HOR-95's role-scoped enforcement is unchanged. No advisory was fixed or
  introduced; the `crypto-js` path carried none.
- **US-094 (HOR-89) — complete, as a removal rather than a migration.** The stage-start
  target revalidation (Context7 first, corroborated against the upstream repository,
  primeui.dev and registry data) invalidated the item's premise twice over. First,
  **PrimeVue v5 is no longer open source**: `primevue@5.0.1`, `@primevue/nuxt-module@5.0.1`
  and `@primeuix/themes@3.0.0` ship under the commercial PrimeUI licence, with no free LTS
  line and no published maintenance commitment for v4; existing MIT versions remain MIT
  forever. Second, the exhaustive consumer audit proved the repository has **zero PrimeVue
  consumers**: no components (the generated manifest held only `RouterLink`/`RouterView`,
  which `vue-router` registers at runtime), no directives, composables, theme imports or
  plugin registration, and zero PrimeVue bytes in the built `.output`. The only wiring was
  dead: the Nuxt module commented out of `modules`, a `PrimeVueResolver` registration whose
  resolver only ever resolved PrimeVue components, and an `optimizeDeps` include for a
  package nothing imported — with `unplugin-vue-components` and
  `@primevue/auto-import-resolver` reaching the config **undeclared**, resolving only
  transitively through the commented-out module (the Stage D loose end recorded in §9).
  Sammy approved deletion over migration, the HOR-59 precedent applied to a whole library:
  no PrimeVue runtime capability is required by the product, so **no Community-vs-Commercial
  licensing decision was made or needed**, and no v5 licence was adopted to modernise unused
  code. The removal deleted `primevue`, `@primevue/nuxt-module` and the deprecated
  `@primevue/themes` from `package.json`, the dead wiring from `nuxt.config.ts`, and a
  commented resolver import from `pages/add.vue` — 228 lockfile-inclusive deletions, zero
  additions, 19 packages out of the store including the undeclared transitive pair, whose
  re-audit confirmed no non-PrimeVue responsibility. Every gate matched the baseline
  exactly: same test count green, byte-identical build size, zero `primevue`/`primeuix`
  occurrences across source and `.output`, a clean `--frozen-lockfile` install, and
  `pnpm-lock.yaml` still the only lockfile. No advisory was fixed or introduced; the
  PrimeVue path carried none.
- **US-096 (HOR-91) — complete.** Prisma 6.19.3 → 7.9.1, `prisma` and `@prisma/client`
  in lockstep, under **ADR-015** as the stage demanded. Sammy approved 7.9.1 as an
  explicit target exception — the newest stable line at child start, with the Prisma 8
  prerelease excluded by §14; the general LTS policy is unchanged. Prisma 7 replaces the
  Rust query engine with a TypeScript query compiler and makes **driver adapters**
  mandatory, so the child added exactly two runtime dependencies:
  `@prisma/adapter-mariadb` 7.9.1 (lockstep) and its driver `mariadb`, pinned exact at
  3.4.5 after Context7 revalidation. The deprecated `prisma-client-js` generator was
  replaced by the modern `prisma-client` generator (kept only to minimise the diff it
  would have been — Sammy chose the target architecture instead); the client now
  generates to `generated/prisma/`, is **gitignored**, and is regenerated
  deterministically by the existing `postinstall` (`prisma generate`) — proven
  hash-identical across regenerations. v7 no longer auto-loads `.env`, so a new
  `prisma.config.ts` loads it via `process.loadEnvFile()` and declares its datasource
  **conditionally**, keeping `prisma generate` working in clean CI with no
  `DATABASE_URL` at all — without inventing a fake one. The schema diff is two lines:
  the generator block, and the datasource `url` line that moved into the config. All 44
  client-owning server files were rewired mechanically (new import path, adapter
  injection); the per-request ownership pattern itself was deliberately **not**
  refactored. Adapter pool settings were set consciously to v6 parity (connection limit
  10, connect timeout 5 s, acquire timeout 10 s, idle timeout 300 s) rather than
  inheriting the adapter's defaults. Two behavioural contracts were protected with new
  tests (13 added): the adapter helper's URL parsing and lifecycle, and the **Bytes
  contract** — v7 returns plain `Uint8Array` where v6 returned Node `Buffer`, which
  changes the JSON wire shape `decodedNotes()` depends on, so the one serving raw-query
  path (`server/api/storehorses.post.ts`) restores the Buffer shape at the boundary
  (`server/utils/rawQueryBytes.ts`); the auth `token_hash` path needed nothing, as it
  never serialises Bytes to a client. The v7 CLI's flag rename was absorbed by the three
  schema-gate tests (`--to-schema-datamodel` → `--to-schema`, see testing-strategy §11).
  One platform defect surfaced: Nitro bundles the generated client and rewrites
  `import.meta.url`, whose virtual value crashes the client's `__dirname` shim on
  Windows at startup (`ERR_INVALID_FILE_URL_PATH`); a dependency-free inline Rollup
  transform in `nuxt.config.ts` guards that one statement, POSIX behaviour unchanged.
  **This child also closed the §10 crossing**: with the client out of `node_modules`,
  the `node-linker=hoisted` premise died, and `.npmrc` was deleted after a consumer
  audit — a clean `--frozen-lockfile` install under pnpm's default isolated layout
  passed every gate. `hbold` was never mutated; the schema↔database residual diff is
  **byte-identical before and after** — the same 19 deferred legacy statements — and
  `migrate status` stays clean. Gates: 36 test files / 438 tests green (baseline 34/425
  plus the 13 new, no reduction), production build green, core regression against
  `hbold` green (search → pedigree → maternal line → progeny → breeder horses), failure
  responses scanned — no Prisma class names, SQL, connection details or stack traces
  leak to clients. No advisory was fixed or introduced: the 6 pre-existing high
  advisories in the Nuxt build toolchain are untouched and unrelated.
- **US-097 (HOR-92) — complete.** MariaDB 10.11 LTS → **12.3 LTS** for the local
  reference environment, under **ADR-016**. The stage-start revalidation (Context7 plus
  the official MariaDB release and lifecycle sources) mapped the candidate lines — 11.4
  (older, ends before 12.3), 11.8 (shortest runway of all candidates), 12.3 (newest
  LTS, maintained to mid-2029), 13.x (rolling, excluded by policy) — and Sammy chose
  12.3. Durable references name the **line**; the runbook pins the series tag
  `mariadb:12.3`, and the container plus image digest own the exact patch (the tag
  resolved to 12.3.2 at migration time). The migration was **side-by-side, never
  in-place**: the old `hb-mysql` sat on an anonymous volume, and MariaDB supports no
  downgrade after a system-table upgrade, so starting the new image over that volume
  would have destroyed the only live rollback. Instead: a fresh
  checksum-verified `--databases` dump of the current `hbold` (restore-proven before
  use), a disposable 12.3 environment on its own port and named volume, and the full
  gate battery there before any cutover — restored-current `migrate status` up to
  date; a second environment rebuilt from the clean legacy baseline converging through
  the migration history; a 464-line before/after invariant matrix identical except two
  explained server-level facts (the 11.8+ `utf8mb4`/`uca1400` server defaults, which
  table- and column-explicit charsets shield `hbold` from, and 12.3's
  `transaction_isolation` alias); `CHECKSUM TABLE EXTENDED` identical across all 41
  tables; `sql_mode` and transaction semantics unchanged with zero config overrides;
  the schema↔database residual diff **byte-identical across versions** — the same 19
  deferred legacy statements — and every migration file hash unchanged; the full
  36-file / 438-test suite and production build green; a 9-test disposable Prisma 7
  runtime probe (reads, pagination, compound uniques, registration, `P2002`, `Bytes`
  round-trip, interactive-transaction rollback, refresh-token rotation) green; an
  18-query production regression battery hash-identical between server lines, with
  controlled failures leaking no internals. The cutover itself was reversible
  mechanics: stop and rename the 10.11 container to `hb-mysql-1011-rollback`, bring up
  the new canonical `hb-mysql` (`mariadb:12.3`, named volume `hb-mysql-123-data`,
  same credentials — no rotation), restore the verified dump, and verify
  `SELECT VERSION()` **through the application adapter path** plus the same 18-query
  battery against the pre-cutover baseline. Rollback was then **tested live** — swap
  back to 10.11, verify version and row counts, swap forward again. The preserved
  10.11 container is retained stopped; its removal is a separate decision (ADR-016
  review trigger). `hbold` content was never mutated: 59,903 horses,
  identical checksums, `latin1` database default preserved. No Prisma, schema,
  charset, engine or credential change; no advisory fixed or introduced.

- **US-098 (HOR-93) — complete.** The closing sweep, run as small attributable slices
  rather than one blind transaction. **Removals**, each gated on a proven zero-consumer
  audit before deletion: `axios` (every call site had already moved to Nuxt's own
  `$fetch`, and nothing replaced its responsibilities), `@vee-validate/nuxt` (the module
  and only the configuration proven specific to it — no validation logic was touched),
  the root `postcss` declaration (Tailwind 4 is a Vite plugin under ADR-009 and no file
  in the repository owns a direct PostCSS responsibility, so the declaration was dead
  rather than out of date), and the unused `nuxt-file-storage` module. A transitive
  refresh moved the vulnerable `brace-expansion` and `tar` closures without touching a
  declared range. **Updates**, one transaction each, every target chosen from the
  library's own support policy rather than from registry `latest`: `@nuxt/test-utils`
  4.1.0 — which also dropped the `h3` prerelease its previous line pulled in —
  `happy-dom` 20.11.6, `vitest` 4.1.11, `vue` 3.5.41, `@stripe/stripe-js` 9.14.0,
  `@types/bcrypt` 6.0.0 (a types-only major: the new surface compiled with no
  behavioural change) and `prettier` 3.9.6 with **no repository-wide reformat** — the
  formatter moved, the formatting did not. **Deliberate keeps:** the `mariadb` driver
  stays pinned exactly to the version `@prisma/adapter-mariadb` declares, because
  ADR-015 owns that pin and its review trigger — the adapter changing its own
  declaration — has not fired; and `vue3-carousel` stays on the 0.4 line. The carousel
  decision was measured, not assumed: 0.17.0 was installed in a disposable probe and
  compared against the two consumers in the repository. `wrapAround` now emits clone
  slides, which changes what an index click means in the gallery's thumbnail strip;
  upstream's own gallery-with-thumbnails recipe has moved from the `v-for` index to a
  scoped slot; slide height became a required configuration concept that did not exist
  in 0.4; and the navigation button metrics changed. There is no automated coverage of
  either consumer, the live one is a customer-facing screen, and no advisory names the
  package — so the migration is a **separate, visually verified change**, not a
  patch-sweep line item. **Advisories went from 8 (7 high, 1 moderate) to 1.** The
  survivor is `deepmerge-ts`, reached only through `@prisma/config`, which declares it
  as an exact version rather than a range: no lockfile refresh can move it, no supported
  Prisma release changes it, and the only alternatives would be an override, a fork or a
  patch — none of which fix anything, so the risk is accepted rather than silenced. It
  is toolchain-only in this build — absent from both the client and the server output —
  and the sole object graph it merges is the repository's own versioned
  `prisma.config.ts`. **Python:** the extractor's single dependency, `python-docx`, was
  confirmed to be the current release for the supported interpreter line, so the pin did
  not move and no extractor behaviour changed. What was missing was the durable rule
  itself, which now lives in
  [local-development §10](../runbooks/local-development.md) — the extractor targets the
  Python 3.14 line and runs its current supported patch, the interpreter is a
  machine-level concern this repository does not manage, and no tracked file pins a
  patch.

**Stage J is complete.** All ten children (US-089–US-098) are in `main`, which closes the
last stage on the map: every stage from A to J is now Done. The deferred and ADR-heavy
tail no longer exists as modernisation debt. Two dependency items remain deliberately
open and are tracked outside this stage — the `vue3-carousel` 0.17 migration and the one
accepted upstream-blocked advisory above.

---

## 14. Rules

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

## 15. Updating this document

Update it when a stage **completes** — move the row to Done, add the summary section, and
point the "next stage" section forward.

Do not add current version numbers. Do not add future target versions. Do not copy Linear
evidence here; link the issue instead.
