# ADR-008: Keep the flat repository structure during framework majors

**Status:** Accepted
**Date:** 2026-08-13
**Deciders:** Sammy

---

## Context

Nuxt 4 changed a default. Where Nuxt 3 resolved application code from the repository
root, Nuxt 4 resolves it from `app/`: `components/`, `composables/`, `layouts/`,
`middleware/`, `pages/`, `plugins/`, `utils/`, `app.vue` and `error.vue` are all expected
one level down. `server/` and `public/` stay at the root in both majors.

This repository has always kept that code at the root. Adopting the new default during the
framework major would move roughly every application directory in the project, in the same
change that swaps the framework, Vue Router and Unhead.

Two facts shape the decision.

**The two changes have nothing to do with each other.** Moving files does not make the
framework work; the framework works either way. One is a version migration with a
verifiable before/after; the other is a repository reorganisation with no runtime effect
at all.

**They fail differently, and mixing them destroys the evidence.** A framework major is
verified by comparing behaviour before and after: same tests, same build, same rendered
output, same API responses. That comparison is only meaningful when the file paths on both
sides are the same. Move every directory at the same moment and a diff of a thousand
renames hides the four lines that actually changed the framework — and any regression
becomes impossible to attribute to a cause.

Nuxt 4 supports staying at the root. `srcDir` and `dir.app` are documented configuration
options, not a compatibility shim, and the opt-out needs no `compatibilityVersion` flag or
legacy mode.

---

## Decision

**A framework major migration never doubles as a repository directory reorganisation.**

While a framework major is in flight, the repository keeps its current structure through
officially supported configuration. For Nuxt 4 that is, in `nuxt.config.ts`:

```ts
srcDir: ".",
dir: {
  app: "app"
}
```

`srcDir: "."` restores root resolution. `dir.app` keeps the `app.vue` / `error.vue` lookup
directory distinct from the source root, which `srcDir: "."` would otherwise collapse into
the repository root itself.

Adopting the `app/` layout is legitimate work, but it is **separate work**: its own Linear
issue, its own branch, its own before/after verification, and no framework version change
inside it.

This decision binds the general case, not one migration. Any future framework major that
ships a new default directory layout is subject to the same rule.

---

## Rationale

The alternative — migrating the framework and the directory layout together — was rejected
because it removes the only tool available for verifying a framework major.

Stage G of the modernisation plan verified Nuxt 4.5.2 by holding everything else still: the
same tests at the same paths, the same build, and a runtime probe compared line by line
against the Nuxt 3 baseline. That comparison found exactly one difference — Nuxt 4 links
the stylesheet instead of inlining it into the server-rendered HTML — and it was possible
to say so with confidence precisely because nothing else had moved. Under a simultaneous
reorganisation, that same difference would have surfaced inside a diff of hundreds of
renamed files and would have been indistinguishable from a broken import path.

The rule also matches [ADR-001](ADR-001-adopt-existing-nuxt-application.md), which commits
the project to modernising the existing application rather than rewriting it. Relocating
the entire source tree because a default changed is closer to a rewrite than to a version
upgrade, and it is not what the framework asks for: the framework offers the opt-out
itself.

`srcDir: "."` is a supported configuration option, so this costs no compatibility debt. It
is not a deprecated flag and it does not pin the project to legacy behaviour.

---

## Consequences

### Positive

- A framework major produces a diff small enough to read, so a regression can be traced to
  a cause.
- The before/after comparison that verifies a major upgrade stays valid, because the paths
  on both sides match.
- Two changes with different risk profiles can be reviewed, promoted and — if necessary —
  reverted independently.
- No compatibility shim or legacy mode is introduced; the opt-out is documented
  configuration.

### Negative

- The repository diverges from the layout the framework documentation assumes, so examples
  and community answers describe paths one level deeper than this project uses.
- `nuxt.config.ts` carries three lines of configuration that would otherwise be unnecessary,
  and they must be understood before anyone "tidies them away".
- Adopting `app/` remains outstanding work. This ADR defers it; it does not cancel it. A
  later reorganisation will have to touch every application directory in one change.
- Any tooling that assumes the Nuxt 4 default must be told otherwise.

---

## Alternatives Considered

### Migrate to `app/` inside the framework major — Rejected

Rejected because it destroys the verification method. The before/after comparison is what
makes a framework major safe, and it depends on the file paths being identical on both
sides. It also mixes two changes with unrelated failure modes into one revert unit: a
problem found later could not be rolled back without also rolling back the other change.

### Set `compatibilityVersion: 3` — Rejected

Rejected because it is a broader instrument than the problem requires. It reverts a set of
Nuxt 4 behaviours, not just the source directory, which would leave the project running
Nuxt 4 while deliberately not receiving Nuxt 4 semantics — the opposite of the point of the
upgrade. `srcDir` addresses exactly the one default in question and nothing else.

### Adopt `app/` first, in its own issue, then migrate the framework — Rejected

Not wrong in principle, and it would have satisfied the "one concern per change" rule
equally well. It was rejected on sequencing: it would have reorganised the entire
repository against Nuxt 3, for the sole benefit of a Nuxt 4 default that was not yet in
use, and delayed a framework upgrade that carries security relevance behind a change that
carries none.

---

## Review Triggers

- A future Nuxt major stops supporting `srcDir: "."`, or reclassifies it as deprecated or
  legacy behaviour.
- An installed module or officially recommended tool ceases to work outside the `app/`
  layout.
- A dedicated issue is opened to adopt the `app/` structure, with no framework version
  change in it. That work supersedes the deferral in this ADR, not the rule: the rule that
  a framework major stays separate from a directory reorganisation survives it.
- A framework major arrives that cannot be verified by before/after comparison, which would
  invalidate the rationale rather than the decision.
