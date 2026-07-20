# Maternal-Line Write-Up Grammar

**Status:** Active — observed baseline
**Scope:** Historical Word catalogue write-ups consumed by the extractor
**Related:** [ADR-005](../adr/ADR-005-canonical-writeup-library.md) · [automation-mvp.md](../requirements/automation-mvp.md) · [hbold-baseline.md](../data/hbold-baseline.md)

---

## 1. Purpose

This document records the observed structure of the historical maternal-line
write-ups. It is the domain reference behind FR-002, FR-003, FR-004 and FR-005 in
[automation-mvp.md](../requirements/automation-mvp.md).

The Word archive is the source of truth for historical write-ups. Database text
fields contain only fragmentary test data.

All figures in this document are **observed baselines from validated samples**, not
universal guarantees. They inform parser design and test selection. They must not be
treated as invariants, thresholds to enforce, or acceptance criteria on their own.

---

## 2. Document shape

A catalogue page presents the maternal line as ordered sections:

```txt
1st Dam
2nd Dam
3rd Dam
4th Dam
5th Dam and deeper when present
```

`1st Dam` is the foal's mother, `2nd Dam` the grandmother, and so on up the maternal
line. Each section heading, its source order, and its raw source reference must be
preserved during parsing.

---

## 3. Entry format

Entries are highly regular and parseable. The observed canonical shape:

```txt
NAME: sj 1.40m (year)(rider)(COUNTRY) year: pl Nth Event Class Height, ...
dam of: ...
Approved KWPN
(SEE ABOVE)
etc.
```

### 3.1 Discipline codes

| Code | Discipline |
|---|---|
| `sj` | Showjumping |
| `dr` | Dressage |
| `ev` | Eventing |

### 3.2 Competition level

Heights such as `1.40m` indicate the competitive level reached. Height is the most
reliable available signal of a horse's significance.

### 3.3 Visual emphasis is a weak signal

Uppercase and bold formatting may suggest that a horse is notable, but the historical
documents were produced by hand over many years and the formatting contains human
noise: inconsistent bolding, partial capitalisation, and formatting applied for
layout rather than meaning.

**Rule:** prefer the competition height as the significance signal. Treat visual
emphasis as supporting evidence only. Never make identity or canonicalisation
decisions from formatting alone.

### 3.4 `dam of:`

`dam of:` introduces the descendants of the entry's subject. It **can nest** — a
descendant introduced by `dam of:` may itself carry a `dam of:` list. The parser must
model nesting explicitly rather than flattening it.

### 3.5 `(SEE ABOVE)`

`(SEE ABOVE)` is a **reuse reference, not new content**. It points at text already
present earlier in the same document. Expanding it into a copied write-up would
recreate the duplication the canonical library exists to eliminate.

### 3.6 `etc.`

`etc.` may **close** an entry or signal that the enumeration **continues** beyond what
was transcribed. Its meaning is positional and must be resolved from context, not
assumed. It is not a reliable end-of-entry terminator on its own.

### 3.7 Approvals

Studbook approvals appear as free text, for example `Approved KWPN`. They belong to
the entry they follow.

---

## 4. Text-only descendants

Distant descendants frequently do not exist in `storehorse`. This is expected and
acceptable: they legitimately live only as library text with no `horse_id`.

A missing `horse_id` for a distant descendant is **not** an extraction error and must
not be reported as one. It also must not trigger creation of speculative horse
records.

---

## 5. Observed baselines

Measured on validated real-catalogue samples. Directional, not guaranteed.

| Observation | Observed value | Nature |
|---|---|---|
| Duplicated content within a single real catalogue | approximately 37% | Observed sample |
| Occurrences of `(SEE ABOVE)` in that catalogue | 19 | Observed count |
| Maternal-line heads resolved by normalised-name matching | approximately 92% | Observed sample |

These numbers are the empirical justification for the canonical write-up library: a
large share of catalogue text is repetition, so storing one approved text per resolved
mare and reusing it removes most of the manual work.

They are **not** targets. A future catalogue may duplicate more or less, and a
different archive may resolve at a different rate.

---

## 6. Identity resolution signals

Resolution of a Word name to `storehorse.horse_id` uses this cascade:

1. Normalised exact name.
2. Birth year.
3. Sire name.
4. Dam name.
5. Human review.

Normalised name alone resolves most maternal-line heads in the observed sample.
Remaining ambiguity is broken with birth year, then sire and dam context.

Where the cascade does not produce a confident single match, the case goes to human
review. Ambiguous matches are never auto-assigned — see BR-004 in
[automation-mvp.md](../requirements/automation-mvp.md).

---

## 7. Implications

### 7.1 Parsing

- Grammar handling stays separate from database persistence.
- Nesting under `dam of:` must be represented structurally.
- `(SEE ABOVE)` is resolved as a reference, never expanded into duplicated content.
- `etc.` requires contextual interpretation.
- Unsupported or malformed structures fail explicitly and are reported. They are never
  skipped silently.

### 7.2 Provenance

Every extracted entry retains its source document, source section, source position,
extraction run, import timestamp, and parser version — see FR-006.

### 7.3 Errors and ambiguity

- Unsupported structures are reported, not discarded.
- Ambiguous identity produces a review item with the source text and the candidate
  list preserved.
- Conflicting texts for the same resolved mare preserve every variant and create a
  conflict review item. Nothing is overwritten silently.

### 7.4 Human review

Human review is a first-class workflow, not an error path. Missing, ambiguous and
conflicting cases are expected outputs of a correct extraction run.

---

## 8. Testing

Grammar behaviour, edge cases, identity resolution and conflict handling are developed
with TDD, using anonymised or explicitly approved fixtures. Real client documents stay
under `data/private/` and are never committed.
