# ADR-005: Canonical Mare Write-Up Library Fed by Word Extraction

**Status:** Accepted
**Date:** 2026-07-20
**Deciders:** Sammy Maldonado

---

## Context

Historical catalogues repeat the same maternal-line write-ups across many foals. In a
validated real-catalogue sample, roughly 37% of the content was duplicated text and
`(SEE ABOVE)` — an explicit reuse marker — appeared 19 times. The observed grammar and
baselines are documented in [writeup-grammar.md](../domain/writeup-grammar.md).

Manual production copies and edits these texts repeatedly. Repetition creates wasted
work, inconsistency, and conflicting versions.

The source of truth for historical write-ups is the Word archive. Existing database
fields contain only partial test data: `competition_history` has the right shape but is
nearly empty, and `storehorse.remarks` carries fragmentary content only — see
[hbold-baseline.md](../data/hbold-baseline.md).

---

## Decision

Create a canonical write-up library holding:

```txt
one approved canonical write-up per resolved mare, keyed to her horse_id
```

Historical Word catalogues are parsed into structured extracted entries through a
pipeline with explicitly separated stages:

```txt
parsing → identity resolution → canonicalisation → persistence → report assembly
```

Each stage is independently testable. Parser grammar stays independent from database
persistence, and identity resolution stays independent from text parsing.

Foal reports obtain maternal-line content by walking `storehorse.dam_id` and loading the
canonical write-ups of the mares in that line. Text is referenced, never copied per
foal.

Human review is mandatory for uncertainty:

- Ambiguous identity matches are never auto-assigned; they create a review item with the
  source text and candidate list preserved.
- Conflicting source texts for the same resolved mare preserve every variant and create
  a conflict review item. Approved canonical text is never overwritten silently.
- `(SEE ABOVE)` is stored as a reuse reference, never expanded into duplicated content.

Descendants absent from `storehorse` may legitimately remain text-only with no
`horse_id`.

Ingestion is idempotent and resumable: re-running an import must not create duplicate
canonical records.

---

## Rationale

- Eliminates repeated copy/paste, which is the business bottleneck.
- Reuses one approved text across every related report.
- Preserves source provenance for every imported item.
- Supports idempotent re-import and safe bulk ingestion.
- Makes conflicts visible instead of silently overwriting them.
- Keeps parser grammar independent from database persistence, so grammar changes do not
  force migrations.

---

## Consequences

### Positive

- Large reduction in repeated manual work.
- Consistent reports across foals sharing a maternal line.
- Safer bulk ingestion.
- Explainable matching and review.
- Better auditability through retained provenance.

### Negative

- Requires an identity resolution capability with confidence rules.
- Requires conflict and review workflows before bulk ingestion is safe.
- Historical formatting differences must be tested rather than assumed.
- Some descendants remain text-only when absent from the database.

---

## Alternatives Considered

### Store a full copied write-up on every foal — Rejected

Creates duplication and future inconsistency — the exact problem being solved.

### Populate only `storehorse.remarks` — Rejected

The field is incomplete and provides no canonical, provenance, or conflict model.

### Generate directly from Word on every report run — Rejected

Avoids migration but keeps parsing cost and inconsistency in every report run, and gives
no place for approved human corrections to live.

### Auto-resolve ambiguous matches by best guess — Rejected

Silent wrong attribution in a pedigree document is worse than an explicit review item.

---

## Review Triggers

Revisit if:

- the business adopts a different authoritative data source;
- canonical text must support approved historical versions;
- structured competition data becomes the sole report source;
- observed duplication rates change enough to alter the reuse model's value.
