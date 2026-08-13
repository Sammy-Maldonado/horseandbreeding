# ADR-009: Integrate Tailwind CSS through its official Vite plugin, and hold the Tailwind 3 appearance behind a temporary compatibility layer

**Status:** Accepted
**Date:** 2026-08-13
**Deciders:** Sammy

---

## Context

Tailwind CSS 4 changed how Tailwind is installed and how it is configured, and it changed
a set of default styles that apply without a single class changing in the source.

### The integration path this project used no longer exists for the current major

Until now Tailwind reached the application through `@nuxtjs/tailwindcss`, a Nuxt module
that wraps Tailwind and registers it as a PostCSS plugin. That module cannot carry Tailwind
4:

- its `latest` release is `6.14.0`, which pins `tailwindcss` to `~3.4.17` — it *cannot*
  resolve a 4.x;
- `6.14.0` also depends on `@nuxt/kit ^3.16.0`, a Nuxt **3** kit, while this project runs
  Nuxt 4.5.2 since [ADR-008](ADR-008-flat-repository-structure-during-framework-majors.md);
- the only published 7.x artefacts are `7.0.0-beta.0` and `7.0.0-beta.1`. Both are
  pre-releases, and [the modernisation plan](../modernisation/modernisation-plan.md)
  forbids adopting pre-releases.

So the choice is not "module or plugin". Staying on the module means staying on Tailwind 3.

The project's dependence on that module is nonetheless **zero**: no module options block, no
`exposeConfig`, no config viewer, no `editorSupport`, no `tailwindcss:config` or
`tailwindcss:resolvedConfig` hook, and no `#tailwind-config` import anywhere. The
`tailwindcss: {}` entry in `nuxt.config.ts` was the PostCSS plugin key, not module
configuration. Nothing the module provided is in use.

Tailwind 4 ships its own first-party integrations instead, and the one the official Nuxt
installation guide prescribes is the Vite plugin, `@tailwindcss/vite`. It declares
`vite: ^5.2.0 || ^6 || ^7 || ^8`; this project resolves Vite 8.2.1.

### There is nothing to migrate in configuration, and that is itself the risk

`tailwind.config.js` is the untouched generator stub: `content: []`, no theme extension, no
plugins, no safelist. The repository contains no `@apply`, `@layer`, `@variants`,
`@responsive`, `@screen` or `theme()` call. All 1128 `class` and `:class` bindings across
62 components are static literals, ternaries, arrays or objects — nothing constructs a
class name dynamically, so Tailwind 4's automatic source detection has nothing to lose.

The consequence is that this project defines **no design tokens of its own**. It renders
entirely on Tailwind's defaults. `assets/css/main.css`, which contains the only
`font-family` declaration in the repository, is referenced by nothing and has never been
loaded.

An application with no tokens of its own inherits every default change in full.

### A major changes defaults that no class opts into

Tailwind 4 changes base styles that apply to elements the source never annotates:

| Default | Tailwind 3 | Tailwind 4 | Exposure here |
|---|---|---|---|
| Border colour | `gray-200` | `currentColor` | ~200 of 346 `border-*` tokens carry no explicit colour |
| Placeholder colour | `gray-400` | `currentColor` at 50% | every input and textarea |
| Button cursor | `pointer` | `default` | every button and `role="button"` |
| Default sans font | `ui-sans-serif, system-ui, sans-serif, …` | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, …` | every text node, since nothing overrides it |
| Colour palette | hex / `rgb()` | OKLCH, re-derived | 35 of the 43 palette tokens this project uses resolve to a different colour |

The font row is not a v3 → v4 change at all, and this matters. The default `--font-sans`
was still `ui-sans-serif, system-ui, sans-serif, …` in `tailwindcss` 4.0.0, 4.1.0, 4.2.0,
4.3.0, 4.3.1 and 4.3.2. It changed in **4.3.3**, a patch release. It was found by unpacking
each published tarball and reading `theme.css`; the official v3 → v4 upgrade guide does not
mention it, correctly, because it did not happen between those majors.

The palette row was missed by the breaking-change matrix and found only by measuring the
built stylesheet. Converting Tailwind 4's OKLCH values to sRGB and comparing them token by
token against the published `tailwindcss@3.4.19` palette gives a mean CIE76 ΔE of 4.22 over
the 43 tokens in use, with 15 tokens at ΔE ≥ 5 — visibly different — and a worst case of
16.08 at `indigo-600`. The neutrals barely move (every `gray-*` and `slate-*` is under 2)
and the dominant brand colours `sky-900` and `sky-950` are effectively unchanged at 1.36 and
0.73, so the shift concentrates in accents: payment and destructive buttons, alert states,
and the focus rings that `indigo-500`/`indigo-600` drive across 82 call sites.

A dependency upgrade can therefore restyle every page in this application while every test
passes and the build stays green. That is the situation this ADR answers.

---

## Decision

### 1. Tailwind is integrated through its official first-party build plugin

`@nuxtjs/tailwindcss` is removed. `@tailwindcss/vite` is registered in `nuxt.config.ts`
under `vite.plugins`, **appended to** the existing `unplugin-vue-components` registration,
never replacing the array.

Tailwind is no longer a PostCSS plugin here. The explicit `postcss.plugins` block is removed
along with the `autoprefixer` devDependency, because `@nuxt/vite-builder` depends on
`autoprefixer` and `cssnano` directly and applies both by default; the project's copies were
duplicating what the framework already does.

Configuration moves into CSS. `assets/css/tailwind.css` replaces the three `@tailwind`
directives with `@import "tailwindcss";`, and the inert `tailwind.config.js` stub is deleted
rather than carried forward as dead configuration.

### 2. A version upgrade does not change the design

**When a dependency major changes a visual default, this project holds the previous value and
keeps the design it had. The new default is adopted only by an explicit, separate decision
from Sammy, taken against a measured comparison — never as a side effect of an upgrade.**

This is a rule about upgrades, not a rule about Tailwind. It binds the general case.

### 3. The held values are a temporary compatibility layer, not this project's design

`assets/css/tailwind.css` carries a block that restates the Tailwind 3 values Tailwind 4
would otherwise change: the `gray-200` border colour, the `gray-400` placeholder colour, the
`cursor: pointer` on buttons, `--font-sans`, and the 35 palette tokens whose colour moved.
The first three use the compatibility styles published in the official upgrade guide; the
rest are `@theme` variables. Every value was measured — base styles from the stylesheet this
project built before the upgrade, colours from the published `tailwindcss@3.4.19` tarball.

**That block is explicitly not this project's visual identity, and adopting it is not a
design decision.** It exists so that a PRE/POST comparison across Stage H means something:
with the appearance held constant, any visual difference after the migration is a real
regression rather than a restyle that was bundled into an upgrade. It is expected to be
**removed**, not maintained.

All 35 changed palette tokens are held, not only the 15 that differ visibly. A partial hold
would leave a residue that has to be argued about token by token every time someone compares
two screenshots; holding the full set makes the migration provably colour-neutral, which is
the entire point of the layer. The 8 tokens that already resolve identically get no override.

Adopting Tailwind 4's own font stack and OKLCH palette is independent visual work. It needs
a side-by-side comparison, its own issue, and a conscious decision — and it is explicitly out
of scope for Stage H, which did not start it.

Each rule in the block carries a comment naming the default it holds and why, so the block is
legible as deliberate, dated preservation and not as accumulated cruft.

### 4. Utility renames are applied at the call site, not aliased away

Utilities Tailwind renamed or rescaled — `shadow-sm` → `shadow-xs`, `outline-none` →
`outline-hidden`, `flex-shrink-*` → `shrink-*`, the bare `shadow` and `rounded` shifts, and
the `*-opacity-*` modifiers — are rewritten in the components. No compatibility shim
re-defines an old utility name.

---

## Rationale

**On the integration.** There was no real choice to make: the module cannot resolve Tailwind
4, and its stable release also disagrees with the Nuxt major this project already runs. What
the audit had to establish was the *cost* of leaving it, and the cost is nil — the project
uses none of its features. Adopting the officially documented plugin replaces a third-party
wrapper with a first-party one, which is a reduction in dependency surface, not an addition.

**On holding the defaults.** The alternative — accept Tailwind 4's defaults and let the
application look different — was rejected because it is not what a version upgrade is for.
Stage H exists to keep the styling toolchain supported. Redesigning borders, placeholders,
cursors, typography and the whole colour palette is legitimate work with real value, and it
is *different* work: it needs its own issue, a side-by-side comparison, and Sammy's judgement
on each change. Bundling it into a dependency upgrade would ship a redesign nobody chose, and
would make any regression impossible to attribute — exactly the failure mode
[ADR-008](ADR-008-flat-repository-structure-during-framework-majors.md) rejected when it
refused to reorganise the repository inside a framework major.

This is why the compatibility layer is worth its 60 lines. Its value is not that the old
colours are better; nobody has claimed that, and this ADR takes no position on it. Its value
is that it makes the migration *measurable*. With the appearance held constant, PRE and POST
can be compared and any difference is a defect. Without it, every difference needs an
argument about whether it was intended, and a real regression hides among dozens of
deliberate ones.

The font case shows why the rule has to be a rule rather than a checklist. It is not in the
upgrade guide, it is not in any migration tool's output, and it would not have been found by
following the documented process. It was found by measuring. The palette case makes the same
point more sharply: it was missed by this issue's own breaking-change matrix and surfaced
only because the built stylesheet was measured against the previous major's published
palette. A checklist of known breaking changes protects against the changes someone thought
to write down; a standing rule that the design does not move during an upgrade protects
against the ones nobody did.

**On rewriting the call sites.** Aliasing the old utility names back into existence would
have produced a smaller diff and a permanently misleading codebase, where `shadow-sm` means
something Tailwind does not think it means. The renames are mechanical and verifiable; the
shim would be neither.

---

## Consequences

### Positive

- Tailwind is on a supported major, on the integration path its own documentation
  prescribes.
- One fewer third-party dependency between the project and Tailwind, and one fewer place for
  a Nuxt-major mismatch to appear.
- The build no longer duplicates `autoprefixer` on top of what Nuxt already applies.
- Every visual default the project depends on is now written down in the repository instead
  of being inherited silently, so the next major cannot move it without the diff saying so.
- The migration is colour-neutral by construction, which makes PRE/POST verification a binary
  check rather than a tolerance judgement.
- Component source stops carrying utility names that no longer mean what they say.

### Negative

- `assets/css/tailwind.css` carries a compatibility block that must be understood before
  anyone deletes it. It looks like boilerplate and is not.
- The project now restates values that Tailwind considers outdated, so it is deliberately
  running a design one major behind the framework's own defaults. That gap widens with each
  release until a visual issue closes it. The layer is temporary by intent; nothing enforces
  that it is temporary in fact, and an unremoved compatibility layer eventually reads as a
  design choice to whoever finds it next. That is what this ADR exists to contradict.
- Restating 35 palette tokens and a font stack are decisions about appearance made to *avoid*
  changing appearance. They are not endorsements of those values and must be revisited on
  their own merits rather than inherited indefinitely.
- Tailwind 4 requires Safari 16.4+, Chrome 111+ and Firefox 128+. The repository declares no
  browser-support requirement — no `browserslist` key, no `.browserslistrc`, nothing in
  `docs/` — so nothing contradicts this, but nothing sanctions it either.
- Utility renames touch many component files, so this change is broad even though it is
  shallow.

### Negative — accepted with eyes open

`assets/css/main.css` remains orphaned and untouched. Deleting dead code is not in this
issue's scope, and doing it here would mix a cleanup into a migration.

---

## Alternatives Considered

### Stay on Tailwind 3 — Rejected

Defensible only as a deferral. Tailwind 3 still works, and nothing in the application is
broken today. It was rejected because the reason to move is not a feature: it is that
`@nuxtjs/tailwindcss` 6 already pins a Nuxt 3 kit against a Nuxt 4 project, and every further
stage widens that gap. The cost of this migration also only grows, since every component
added under v3 conventions is another set of renames later.

### Wait for `@nuxtjs/tailwindcss` 7 to reach stable — Rejected

This would preserve a wrapper the project does not use, for the sole benefit of not changing
`nuxt.config.ts`. It also has no date, and the modernisation plan forbids adopting the
pre-releases in the meantime. Waiting to keep a dependency that provides nothing is not a
trade-off, it is inertia.

### Adopt Tailwind 4's defaults and accept the visual change — Rejected

Rejected as an unauthorised redesign smuggled inside a dependency upgrade. It is the option
to revisit later, deliberately, per default, with a comparison in hand — not the option to
take by not deciding. Sammy was shown the measured palette comparison and chose to hold the
existing appearance for exactly this reason: so that Stage H stays attributable.

### Hold only the 15 visibly-different palette tokens — Rejected

The 15 tokens at ΔE ≥ 5 are the ones a person would notice, so holding only those would
satisfy the stated concern at two-thirds the size. It was rejected because the remaining 20
moved tokens (ΔE 0.34–4.47) would leave a residue, and a residue turns "does POST match PRE?"
from a yes/no question into an argument about how much difference is acceptable — which is
the argument this whole decision exists to avoid having. The extra 20 lines buy a binary
answer.

### Run `@tailwindcss/upgrade` and take its output — Rejected as authority

Useful as a second opinion, not as the change. The tool rewrites source automatically, and
its output would have to be reviewed line by line regardless; and it would not have caught
the 4.3.3 font change, because that change is not part of the v3 → v4 migration it
implements.

### Hold the old defaults by overriding them in a global stylesheet instead of `@theme` — Rejected

Would work for the border and placeholder colours and fail for the font and the palette,
because `--default-font-family` and every `--color-*` resolve from the theme. Splitting the
same concern across two mechanisms for no reason makes it harder to find. One block, one
place, one thing to delete when the layer goes.

---

## Review Triggers

- **A visual issue is opened to adopt Tailwind's current font stack or its OKLCH palette.**
  This is the expected end of the compatibility layer: the comparison is made deliberately,
  Sammy decides, and the corresponding block is deleted. That work is independent of Stage H
  and was not started by it. The rule in Decision 2 survives; the layer does not.
- `@nuxtjs/tailwindcss` reaches a stable release that supports the current Tailwind and Nuxt
  majors **and** the project acquires an actual need for something it provides. Absent the
  second condition, this trigger does not fire.
- A browser-support requirement is established for Horse & Breeder that conflicts with
  Tailwind's baseline.
- Tailwind changes a default this layer does not hold, and the change is visible. The list
  here is the set measured against this repository at the time of writing, not a permanent
  inventory.
- The application acquires a real design-token layer. Restating individual defaults stops
  being the right instrument once the project defines its own theme.
