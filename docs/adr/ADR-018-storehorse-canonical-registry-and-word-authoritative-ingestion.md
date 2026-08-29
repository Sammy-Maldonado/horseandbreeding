# ADR-018: Use `storehorse` as the Canonical Horse Registry and Marcus's Completed Word Catalogues as the Authoritative Ingestion Source

**Status:** Accepted
**Date:** 2026-08-29
**Deciders:** Sammy Maldonado
**Relationship:** Complements [ADR-005](ADR-005-canonical-writeup-library.md) and
[ADR-017](ADR-017-separate-catalogue-ingestion-from-report-serving.md), which remain
Accepted. Decides the "automatic creation of missing horses" question that ADR-017
deliberately left open. Supersedes the stable-requirement reading "creating a new horse
is out of scope" (former AI-006 wording) with the contract in Decision 5 and 6.

---

## Context

The Automation MVP turns Marcus's historical Word catalogues into automated horse
reports:

```txt
Word catalogue ingestion → structured maternal-line data → canonical write-up library
→ horse identity resolution → pedigree + write-up assembly → professional PDF
→ batch generation from auction Excel → human review only for unresolved cases
```

Two decisions already bind this pipeline. ADR-005 makes the Word archive the source of
historical write-ups and keys one canonical write-up to a mare's `horse_id`. ADR-017
separates ingestion (Word → extraction → resolution → persistence) from serving
(`horse_id` → database → report model → PDF). Both left one question open: what happens
when a horse the Word describes does not exist in the database.

Facts that force the decision now:

- **The extractor is done and verified.** HOR-12 productionised the Word → structured
  maternal-line extraction with zero-loss accounting; HOR-11 proved zero silent loss over
  the full local corpus. The next issues — identity resolution (HOR-14), the relational
  model (HOR-9) and bulk ingestion (HOR-13) — need a settled persistence contract.
- **The current `hbold` snapshot is older than the catalogues.** A read-only, aggregate-only
  identity baseline (2026-08-29) measured the extractor output against the local
  `storehorse` population: among maternal-line heads whose normalised name yields exactly
  one database candidate, roughly one in six checkable cases is contradicted by the dam,
  sire or birth-year evidence the Word carries; `storehorse.birthyear` holds `0` for about
  a third of the rows plus out-of-range values; a substantial share of Word horses have no
  database row at all. The database is therefore evidence of an earlier state, not a
  complete or authoritative record of what Marcus has since catalogued.
- **The prior rule loses information.** CLAUDE.md, `automation-mvp.md` (former §5 and
  AI-006) and `writeup-grammar.md` said identity resolution *never* creates a horse and a
  not-found horse stays in an "explicit unresolved state". Applied to a stale database,
  that rule leaves every Word horse absent from `hbold` permanently unresolved, and its
  business content — pedigree, competition results, approvals, riders, narrative — has
  no canonical home. The Word would be reduced to "a horse and its dam", which is exactly
  the product value the MVP must preserve.
- **A parallel registry was proposed and rejected.** An aborted governance session
  (Linear HOR-141, now Canceled) headed towards a name-first confidence cascade and a
  separate canonical-horse structure mapped onto `storehorse`. Sammy rejected that
  direction: there must be one canonical horse registry, and it is `storehorse`.
- **Schema facts (read-only discovery, nothing modified).** `storehorse.horse_id` is an
  auto-increment primary key; `sire_id` / `dam_id` are integer self-relations with `0`
  meaning unknown; `name` is unindexed free text; `sexe` is a lookup; `status` follows
  ADR-014. `competition_history` exists (`storehorse_id`, rider, year, location, `csi`,
  `type`, height, placing, detail) but is essentially unpopulated and lacks discipline,
  event/class, won-versus-competed, team/individual, country, raw segment, provenance and
  validation state. `approvedby` and `studbook` lookups exist with junction tables that
  carry duplicate pairs. No table records source documents, extraction runs, source
  assertions, identity decisions, review items or canonical write-ups.

Prisma safety (ADR-003), versioned schema evolution (ADR-012) and the `storehorse.status`
semantics (ADR-014) continue to apply; this ADR changes none of them.

---

## Decision

### 1. `storehorse` is the single canonical horse registry

Every horse the system knows canonically is a `storehorse` row identified by `horse_id`.
There is no second canonical horse table, no parallel "canonical horse" model mapped onto
`storehorse`, and no replacement registry. Every relational fact about a horse —
pedigree, write-up, competition result, approval, studbook, discipline, rider, additional
fact, provenance — is anchored to `storehorse.horse_id`.

Two things are deliberately distinguished:

- the **`storehorse` table and `horse_id` model** — the canonical architecture; and
- the **current `hbold` data snapshot** — one population of that table at one point in
  time, which may be stale or incomplete.

The first is authoritative by design. The second is not.

### 2. The current `hbold` contents may be stale

`hbold` is a reconciliation target, not an authority over Marcus's completed catalogues.
It remains valuable for reusing existing `horse_id`s, reading the pedigree already
recorded, deduplication and cross-checking. A stale or missing database row never
justifies discarding Word information, and a fresher database copy is **not** required
before authoritative Word content may be ingested; a fresher copy only improves reuse,
mapping and deduplication.

### 3. Marcus's completed Word catalogues are the authoritative ingestion evidence

A completed catalogue is authoritative for the business content it contains: the lot
horse's identity and immediate pedigree as printed, the maternal generations, `dam of`
descendants, birth year, sex, colour, discipline, performance level, riders, countries,
approvals, studbooks, competition results (year, placing, event, level/class, height),
notable descendants, `(SEE ABOVE)` references, sire/`by`/`v.` notes, family notes,
narrative, raw content and provenance. Ingestion must not reduce a catalogue to "horse +
dam".

Authority is not typo blindness. Ingestion keeps two layers:

- **exact source preservation** — the literal text is retained as extracted; and
- **conservative canonical interpretation** — a value is canonicalised only when it is
  valid and consistent; an impossible value (for example a birth year outside any
  plausible range) is preserved as a source fact, flagged invalid and reported, never
  silently corrected and never written to the canonical column.

### 4. Existing horses reuse `horse_id` — `EXISTING_HORSE`

When a Word horse resolves confidently to an existing `storehorse` row, that `horse_id` is
reused and its related data may be updated under Decision 10.

### 5. Reliably identified new source horses may become `storehorse` rows — `NEW_HORSE`

A Word horse that is reliably identified as a distinct horse absent from the registry may
be created as a new `storehorse` row through the **safe source-derived creation
contract** of the approved ingestion workflow. The contract requires at least:

- evidence from the Word family graph (Decision 7 and the identity rule below), not from
  a name alone;
- no plausible existing candidate left unexplained;
- a full source assertion and provenance record for the created row and each canonicalised
  field, linked to the ingestion run that created it, so the creation is auditable and
  reversible by run context;
- the row conforms to existing column semantics (`status` per ADR-014, `0` sentinels for
  unknown `sire_id` / `dam_id`, valid canonical values only).

What remains prohibited is **unsafe blind creation**: inventing a horse from weak or
name-only evidence, creating a row merely because matching failed, or creating a
duplicate of a horse that already exists. Distant descendants that carry no resolvable
identity may legitimately remain preserved source facts with no `horse_id`.

### 6. Ambiguous identities never create duplicates — `AMBIGUOUS` and `CONFLICT`

Identity resolution yields exactly one of `EXISTING_HORSE | NEW_HORSE | AMBIGUOUS |
CONFLICT` with its evidence. `AMBIGUOUS` never triggers an insert, a merge or an
assignment: the case is persisted as a reviewable state with its candidates and
evidence. `CONFLICT` (the source contradicts the canonical state or another source)
preserves every assertion and goes to human review. A horse absent from the database is
not in itself an error or a review case.

**Identity evidence rule.** Resolution uses the Word family graph — dam, dam's dam, sire,
birth year, sex, descendants and recurrence across documents — never the name alone. A
single name candidate is not a match.

### 7. `sire_id` / `dam_id` remain the canonical pedigree relations

Pedigree is stored only in `storehorse.sire_id` and `storehorse.dam_id`. A resolved
`dam of` relationship is canonicalised as `child.dam_id = dam.horse_id`; a resolved sire
as `child.sire_id = sire.horse_id`. Relations whose endpoints are not both resolved stay
as source assertions and are never guessed. No duplicate parentage or ancestry table is
introduced (ADR-017); `mareline_id` groups families and is not pedigree.

### 8. Competition results and additional business information are stored relationally around `horse_id`

- **Competition results are first-class relational data** linked to the `horse_id` of the
  horse that achieved them — a dam's or descendant's results belong to that horse, never
  to the auction lot horse. The existing `competition_history` table is evolved additively
  rather than replaced; the model must support discipline, year, placing / won /
  competed, event, level or class, height, team or individual, rider, country, raw
  segment, provenance and validation state.
- **Other business information** is handled in three classes: (A) first-class relational
  facts — sex, colour, birth year, discipline, performance level, approvals, studbooks,
  riders, countries — reusing the existing lookup and junction tables where they fit;
  (B) structured reusable narrative and fact records — the canonical write-up (ADR-005),
  family notes, sire notes; (C) preserved source-only content — meaningful text the
  system cannot yet structure, retained with provenance and never dropped.
- Storage shape is driven by domain semantics. Presentation needs never dictate it.

### 9. Source assertions and provenance are preserved

Every canonical value derived from a catalogue keeps its source assertion: source
document, extraction run, lot, section, position, raw segment, normalised value, the
decision taken, who or what took it, and the run context. Provenance survives later
canonical updates: when a canonical value changes, the previous value, the source value
and the decision are recorded rather than replaced.

### 10. Word-versus-`hbold` and Word-versus-Word conflicts are auditable

- **Word versus `hbold`:** where the Word is clear and the identity is confident, the Word
  value wins — but never through an unaudited destructive overwrite. The previous
  database value, the source value, the provenance, the decision and the run context are
  all recorded. Where the Word is not clear, the case is a `CONFLICT`.
- **Word versus Word:** two catalogues that disagree about the same horse are both
  preserved. There is no "newest wins", "oldest wins", "first wins" or "last wins" rule;
  the case is a `CONFLICT` for human review.

### 11. Zero loss extends through canonical persistence

The extractor's zero-silent-loss accounting (HOR-12, HOR-11) extends to ingestion. Every
meaningful extracted item ends in exactly one explicit state:

```txt
CANONICALISED_STRUCTURED | CANONICALISED_RELATIONSHIP | PRESERVED_SOURCE_FACT
| AMBIGUOUS | CONFLICT | EXPLICITLY_UNSUPPORTED | ERROR
```

and `UNACCOUNTED_AFTER_INGESTION = 0` is a required outcome of every run. `(SEE ABOVE)`
is a reference layer, never duplicated canonical history. The same horse appearing in
many catalogues remains one `horse_id`; deduplication of canonical facts never deletes
source occurrences or provenance. Bulk ingestion remains resumable and idempotent.

### 12. Runtime reporting reads the database and never re-parses Word

Report assembly reads `storehorse`, pedigree, competition information, maternal-family
facts, write-ups and other canonical business information and builds a report model. The
Word is ingestion evidence, not serving-time input (ADR-017, reaffirmed).

### 13. PDF presentation is independent of the persistence shape

The PDF reproduces the business content Marcus sells today in a modern presentation from
the report model. It may visually separate pedigree, maternal line, highlighted dams,
competition history, notable offspring, performance levels, approvals and additional
facts, but it never shapes the storage model. Content parity, not byte-for-byte layout
parity, is the goal.

### Resulting pipeline

```txt
Word catalogue
→ extraction (HOR-12, zero-loss accounting)
→ source evidence (assertions + provenance)
→ identity resolution / reconciliation (family graph)
   → EXISTING_HORSE  → reuse horse_id, audited update
   → NEW_HORSE       → insert storehorse row via the safe creation contract
   → AMBIGUOUS       → persisted review state, no insert, no merge
   → CONFLICT        → all assertions preserved, review
→ storehorse (canonical registry)
→ pedigree (sire_id / dam_id) · competition results · approvals · riders · facts
→ canonical write-ups (ADR-005) · preserved source-only content
→ provenance and audit
→ report model → modern PDF (ADR-017 serving path)
```

### Current schema reuse map (discovery only — nothing modified)

| Capability | Current table or model | Decision |
|---|---|---|
| Horse registry | `storehorse` (`horse_id`, name, birthyear, sexe, color, status, …) | REUSE_AS_IS as the canonical registry; additive evolution only if an approved issue proves the need |
| Pedigree | `storehorse.sire_id` / `storehorse.dam_id` self-relations | REUSE_AS_IS |
| Sex | `sexe` lookup | REUSE_AS_IS |
| Competition results | `competition_history` | REUSE_WITH_TARGETED_EVOLUTION (additive columns for discipline, event/class, result kind, team/individual, country, raw segment, provenance, validation state; link by `storehorse_id`) |
| Approvals | `approvedby` + `storehorse_has_approvedby` | REUSE_WITH_TARGETED_EVOLUTION (uniqueness of pairs, provenance) |
| Studbooks | `studbook` + `studbook_has_storehorse` | REUSE_WITH_TARGETED_EVOLUTION (uniqueness of pairs, provenance) |
| Disciplines / levels | `diciplines`, `diciplinevalues`, `storehorse_has_diciplinevalues` | REUSE_WITH_TARGETED_EVOLUTION (audit values, provenance) |
| Rider, country | `storehorse.rider` (user id), `competition_history.rider` (text), `countries` | REUSE_WITH_TARGETED_EVOLUTION (rider as text or lookup on the result, country lookup) |
| Colour | `storehorse.color`, `tbl_color` | REUSE_AS_IS |
| Canonical write-ups | none | NEW_RELATIONAL_CAPABILITY_REQUIRED (HOR-9, ADR-005) |
| Source documents, extraction runs, source assertions, provenance | none | NEW_RELATIONAL_CAPABILITY_REQUIRED (HOR-9) |
| Identity decisions, review items, conflict state | none | NEW_RELATIONAL_CAPABILITY_REQUIRED (HOR-142) |
| Additional facts, family notes, preserved source-only content | none | NEW_RELATIONAL_CAPABILITY_REQUIRED (HOR-9) |
| `storehorse.remarks`, `storehorse.comments` as canonical write-up | present | DO_NOT_REUSE for that purpose (ADR-005); columns are kept |
| `mareline_id` as pedigree | present | DO_NOT_REUSE as pedigree; column is kept |
| `storehorse_new`, `marcustest`, `horse_details` | present | DO_NOT_REUSE; never deleted without an approved issue (ADR-003) |

Exact table and column names, migrations and the resolver's runtime boundary are decided
in the owning implementation issues, not here.

---

## Rationale

- **One registry, one identity.** Every existing feature, the pedigree relations, the
  canonical write-up key (ADR-005) and the serving path (ADR-017) already resolve to
  `storehorse.horse_id`. A second canonical structure would double identity, duplicate
  mapping logic and make "which horse is this" answerable in two places.
- **Authority follows completeness.** Marcus's completed catalogues are the most complete
  statement of the business content the product must reproduce; the database snapshot is
  demonstrably older and partly junk. Treating the snapshot as authority would discard
  the very information the MVP is built to preserve.
- **Safe creation is the only way to keep the information.** With a stale registry,
  "never create" and "lose nothing" cannot both hold. Creation bounded by family-graph
  evidence, provenance and reversibility keeps both the registry and the source honest;
  what the old rule really guarded against — blind creation — stays prohibited.
- **Precision over recall.** The baseline showed name-only matching mis-assigns at a rate
  no review workflow could absorb silently. Family-graph evidence and explicit `AMBIGUOUS`
  / `CONFLICT` states make wrong attribution visible instead of quiet.
- **Audit instead of overwrite.** Recording previous, source and decision for every
  canonical change is what allows the Word to win without destroying the database's
  history — and what allows a wrong ingestion run to be undone.
- **Reuse before invention.** `competition_history`, the approval, studbook and discipline
  lookups already exist; evolving them additively respects ADR-003 and ADR-012 and keeps
  the legacy application working.

---

## Consequences

### Positive

- A single, explicit source-of-truth contract: Word for business content, `storehorse`
  for canonical identity, provenance for the bridge between them.
- Word horses absent from `hbold` gain a canonical home instead of a permanent
  unresolved state; their pedigree and results become relational data.
- Every ingestion decision is auditable, reversible by run context and free of silent
  loss, which is what makes bulk ingestion (HOR-13) and human review (HOR-22) tractable.
- The serving path and the PDF consume one canonical model; no runtime parsing, no
  presentation-driven storage.

### Negative

- Identity resolution becomes more demanding: it must build and evaluate the family
  graph and produce four outcomes with evidence, and it must be tested TDD-first.
- The relational model (HOR-9, HOR-142) grows: source documents, extraction runs, source
  assertions, identity decisions, review items, conflict state and additive evolution of
  `competition_history` and the junction tables are all required before bulk ingestion.
- Safe creation introduces write paths into `storehorse`; they need the audit record, the
  run context and a rollback procedure before the first real run.
- Human review must be able to act on `NEW_HORSE` proposals that fail the safe contract
  and on `CONFLICT` cases, not only on ambiguous names.

---

## Alternatives Considered

### A parallel canonical-horse table mapped onto `storehorse` — Rejected

Two registries mean two identities per horse, duplicated mapping and a permanent
question of which one a feature should trust. The existing application, pedigree and
ADR-005 already key on `storehorse.horse_id`.

### Keep "never create"; leave absent horses as text-only — Rejected

Correct only while the registry is complete. Against a stale snapshot it strands every
new Word horse, loses its pedigree and results as relational data, and shrinks the Word
to "horse + dam".

### Treat `hbold` as authority, or require a fresher database before ingesting — Rejected

The snapshot is demonstrably older and partly junk. A fresher copy is useful and welcome
(HOR-32) but is not a precondition for preserving authoritative Word content.

### Name-first confidence cascade with a single-candidate match — Rejected

Measured to contradict dam/sire/year evidence in roughly one in six checkable cases.
Name alone is not identity.

### "Newest catalogue wins" for Word-versus-Word conflicts — Rejected

Any automatic ordering rule silently destroys one authoritative assertion. Both are
preserved and reviewed.

### A separate parentage or ancestry table — Rejected

Pedigree already lives in the self-relations; a second representation is the
denormalisation ADR-017 defers to a measured performance case.

### Letting the PDF layout define the storage model — Rejected

Presentation changes; domain semantics do not. Storage follows the domain.

---

## Non-Decisions

This ADR deliberately does **not** decide:

- exact table and column names for provenance, source assertions, review items, write-ups
  or the `competition_history` evolution (HOR-9, HOR-142);
- the exact normalisation rules, evidence thresholds and runtime boundary of the identity
  resolver (HOR-14 design; recorded in `writeup-grammar.md` §7 once approved);
- the birth-year plausibility range (HOR-144);
- whether bulk ingestion requires the complete Word archive (HOR-13, to be revalidated
  with Marcus);
- any migration, any change to `hbold`, any insert or update of a horse.

---

## Review Triggers

Revisit if:

- Marcus adopts a different authoritative record of catalogue content;
- a verified, current database export proves more complete than the catalogues for a
  class of facts;
- the safe creation contract produces duplicates or wrong horses at a measured rate the
  review workflow cannot absorb;
- a measured performance case requires a denormalised pedigree or result representation.
