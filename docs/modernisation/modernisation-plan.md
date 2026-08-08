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
| **C** | `package.json` metadata hygiene — align declared ranges to resolved, add `engines` | Not created | **Next** |
| **D** | Remove the deprecated PrimeVue Nuxt module and wire the supported one | Not created | Planned |
| **E** | Prisma client major upgrade — client only, no database or schema change | Not created | Planned |
| **F** | Contained single-major library upgrades, split one issue per library | Not created | Planned |
| **G** | Nuxt framework major migration — the pivot; includes the content-module sub-migration | Not created | Planned |
| **H** | Tailwind CSS major migration — depends on the build tooling that arrives with Stage G | Not created | Planned |
| **I** | Stripe integration modernisation, including replacing the unmaintained module | Not created | Planned |
| **J** | Deferred and ADR-heavy items — next Prisma major, MariaDB LTS migration, PrimeVue major, router major, dead-weight cleanup, advisory sweep, Python patch | Not created | Deferred |

**Order rationale:** external tooling → runtime → hygiene → dead-weight removal → contained
data layer → contained libraries → framework (the pivot) → CSS → payments → deferred and
ADR-heavy. Each earlier stage de-risks the next.

**Only Stages A and B have Linear issues.** Stages C–J are planned but **not created**.
Creating a stage issue requires Sammy's authorisation.

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

## 6. Next stage — Stage C

**Stage C is next and has not been started.** Its Linear issue does **not** exist.

Scope, from the HOR-48 audit: `package.json` metadata hygiene — align the declared
dependency ranges to the versions that already resolve, and add the missing `engines`
field. No resolved version changes, so no application behaviour changes.

Creating the Stage C issue **requires Sammy's authorisation**. No agent starts it
automatically.

---

## 7. Rules

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

## 8. Updating this document

Update it when a stage **completes** — move the row to Done, add the summary section, and
point the "next stage" section forward.

Do not add current version numbers. Do not add future target versions. Do not copy Linear
evidence here; link the issue instead.
