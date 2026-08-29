# Maternal-Line Write-Up Grammar

**Status:** Active — observed baseline, reconciled with Extractor Baseline B (2026-08-28)
**Scope:** Historical Word catalogue write-ups consumed by the extractor
**Related:** [ADR-005](../adr/ADR-005-canonical-writeup-library.md) · [ADR-017](../adr/ADR-017-separate-catalogue-ingestion-from-report-serving.md) · [automation-mvp.md](../requirements/automation-mvp.md) · [hbold-baseline.md](../data/hbold-baseline.md)

---

## 1. Purpose

This document records the observed structure of the historical maternal-line
write-ups. It is the domain reference behind FR-001, FR-002, FR-003, FR-005 and FR-006
in [automation-mvp.md](../requirements/automation-mvp.md).

The Word archive is the source of truth for historical write-ups. Database text
fields contain only fragmentary test data.

The grammar below distinguishes two things that must never be confused:

- the **canonical / common form** — the shape most entries take, useful for parser
  design and test selection;
- the **observed structural variants** — real deviations found in the historical
  documents, which a correct extractor must preserve and report rather than force
  into the canonical shape or drop.

All figures in this document are **observed baselines from bounded samples**, not
universal guarantees. They inform parser design and test selection. They must not be
treated as invariants, thresholds to enforce, or acceptance criteria on their own.

---

## 2. Document shape

### 2.1 Lot structure

In the sampled catalogues each lot follows one observed model:

```txt
top-level pedigree table
→ lot boundary
→ lot-level paragraphs
→ Dam sections (1st Dam, 2nd Dam, …)
```

A top-level Word table opens each lot and reliably acts as the **lot boundary**. Its
cells carry the lot's own identity text (the catalogued horse, lot number and
immediate pedigree as printed).

Rules:

- The table is the source of **lot identity text**. The extractor must read enough of
  it for downstream identity resolution to know which horse/lot the extracted
  material belongs to. Extracted lots without identity are unusable.
- The table is **not** the authoritative pedigree. The Automation MVP pedigree comes
  from relational `storehorse.sire_id` / `storehorse.dam_id` (AI-002 in
  [automation-mvp.md](../requirements/automation-mvp.md)). The extractor never
  rebuilds sire/dam ancestry from Word and never becomes a second pedigree engine.
- How the identity text is resolved to a `horse_id` is owned by identity resolution
  (FR-004, section 7 below), not by this grammar.

### 2.2 Dam sections

A catalogue lot presents the maternal line as ordered sections:

```txt
1st Dam
2nd Dam
3rd Dam
4th Dam
5th Dam and deeper when present
```

`1st Dam` is the foal's mother, `2nd Dam` the grandmother, and so on up the maternal
line. Each section heading, its source order, its occurrence within the lot, and its
raw source reference must be preserved during parsing.

Paragraph order within a lot is deterministic and is itself structural evidence
(section 4).

### 2.3 Content before the first Dam heading

Real catalogues contain meaningful paragraphs **between the pedigree table and the
first Dam heading**. Observed content includes:

- the lot horse's own competition record;
- progeny / `dam of:` information for the lot horse;
- continuations split from neighbouring paragraphs.

**Rule:** meaningful pre-Dam source content must never be silently discarded. Where the
grammar is known it may be parsed as lot-level content; otherwise it is preserved as
explicit unclassified / unsupported lot-level source material. Uncertain content is
never forced into a Dam section.

### 2.4 Merged heading and entry

Historical material may put a heading and an entry in **one paragraph**:

```txt
Nth Dam <entry text>
```

**Rule:** a paragraph that begins with a Dam heading may still carry an entry. The
extractor must either split heading and entry safely or report the structure
explicitly. It must never consume the entry merely because the paragraph began with a
heading.

### 2.5 Repeated Dam ordinals

The same Dam ordinal may occur more than once inside one table-bounded lot. This may
represent a source error, a duplicated section, additional pedigree/lot structure, or
another ambiguous condition of a hand-maintained document.

**Rule:** repeated ordinal sections are never silently merged into one confirmed
section. Each occurrence keeps its own order and source position, and the repetition is
reported as ambiguous.

---

## 3. Entry format

### 3.1 Canonical form

The canonical / common shape of an entry:

```txt
NAME: sj 1.40m (year)(rider)(COUNTRY) year: pl Nth Event Class Height, ...
dam of: ...
Approved KWPN
(SEE ABOVE)
etc.
```

The subject name is the text before the first colon. This works for canonical entries
and is worth keeping — but it is not universal: entries without a colon exist and are
meaningful (section 3.11).

The canonical form is the design target for structured parsing. It is **not** a
description of every historical entry: the documents were produced by hand over many
years and contain the variants recorded in the rest of this section. An extractor that
handles only the canonical form loses real content.

### 3.2 Discipline and level codes

Canonical discipline codes:

| Code | Discipline |
|---|---|
| `sj` | Showjumping |
| `dr` | Dressage |
| `ev` | Eventing |

Competition significance is **not** limited to `sj 1.40m`. Observed variants include:

- eventing codes such as `CCI`, `CNC`, `CIC` (with their star levels);
- dressage codes such as `CDI`;
- other historical codes present in the sources;
- whole-metre heights such as `sj 1m`;
- uppercase variants such as `SJ 1.40m`;
- unspaced variants such as `sj1.40m`.

**Rule:** recognised codes may be structured. An unknown or unrecognised code preserves
its source text and is reported. It is never silently converted into "no discipline".

### 3.3 Competition level

Heights such as `1.40m` indicate the competitive level reached. Height is the most
reliable available signal of a horse's significance where a height is present; for
eventing and dressage the level code plays the same role.

### 3.4 Visual emphasis is a weak signal

Uppercase and bold formatting may suggest that a horse is notable, but the formatting
contains human noise: inconsistent bolding, partial capitalisation, and formatting
applied for layout rather than meaning. In the sampled documents bold tends to mark
height/level tokens and significant results rather than whole entries.

**Rule:** prefer the competition height or level as the significance signal. Treat
visual emphasis as supporting evidence only, retained as formatting evidence where
structurally meaningful. Never make identity or canonicalisation decisions from
formatting alone.

### 3.5 `dam of:` and descendant hierarchy

`dam of:` introduces the descendants of the entry's subject. It **can nest** — a
descendant introduced by `dam of:` may itself carry a `dam of:` list.

The historical documents encode the descendant hierarchy through any combination of:

- **paragraph order** — descendants follow their dam;
- **relative indentation** — deeper descendants are indented further than their dam
  (section 4);
- **chained expressions in a single paragraph** — `X: dam of: Y: dam of: Z: …`.

Punctuation varies: `dam of` without a colon and `dam of;` were both observed.

Fused typo shapes also occur: a word running straight into `dam of` with no space,
and a digit running straight off it (`…dam of` / `dam of3…`). The 2026-08-29 corpus
check found 7 such occurrences across 6 documents. The marker is recognised only at
word boundaries, so a fused occurrence is **not** a descendant marker: no descendants
are fabricated from it, and the fused text is preserved unparsed instead.

**Rule:** the extractor output needs a structural descendant representation —
relationships, nesting, source order and, where relevant, the indentation evidence. A
boolean "has descendants" flag is insufficient and loses the descendant text entirely.
Chained relationships are represented where safely interpreted and reported as
ambiguous otherwise. Expanding `(SEE ABOVE)` inside a descendant is not required.

### 3.6 `(SEE ABOVE)`

`(SEE ABOVE)` is a **reuse reference, not new content**. It points at text already
present earlier in the same document. Expanding it into a copied write-up would
recreate the duplication the canonical library exists to eliminate. Its detection was
reliable in the sample and is worth preserving.

As with `dam of` (section 3.5), fused typo shapes exist: a word or digit running
straight into or off `see above` with no space. The 2026-08-29 corpus check found 3
such occurrences across 3 documents. A fused occurrence is not recognised as a
reference; the text is preserved unparsed.

### 3.7 `etc.`

`etc.` may **close** an entry or signal that the enumeration **continues** beyond what
was transcribed. Its meaning is positional and must be resolved from context, not
assumed. It is not a reliable end-of-entry terminator on its own, and its position in
the source must be retained rather than reduced to a flag.

### 3.8 Approvals

Studbook approvals appear as free text, for example `Approved KWPN`. They belong to the
entry they follow. Observed variants:

- approvals may exceed four letters (`HOLST`, `WESTF`, `OLDBG`);
- case varies (`Approved`, `approved`);
- an entry may carry several approvals.

**Rule:** approvals are captured in full and in number. Truncating a studbook code or
keeping only the first approval loses information.

### 3.9 Results

Canonical result grammar, comma-separated:

```txt
YYYY: pl N <event / class / height detail>, YYYY: pl N <detail>, ...
```

Ordinary comma-separated `YYYY: pl` results parse well and must keep working. Observed
variants — a non-exhaustive record, not a whitelist — include:

- `won` instead of a placing;
- `competed at` without a placing;
- an ordinal result without the literal `pl` (`2nd …`);
- `pl1st` and `pl,1st`;
- a year group with no placing at all;
- full stop or whitespace rather than a comma between results;
- a result that ends without any detail;
- fault / result annotations after the placing.

**Rule:** recognised variants may be structured. Unrecognised result text remains
preserved and is explicitly reported with its parsing status. A second result is never
swallowed silently into the previous result's detail.

### 3.10 Subject scoping

Subject-level fields — birth year, rider, country, approval — belong to the entry's
subject head. They must be parsed from the correct subject context and never taken
from nested descendant text. Searching the whole remainder of an entry for the first
`(YYYY)` or `(COUNTRY)` attributes a descendant's data to the subject.

### 3.11 Other observed content

Further structures observed in the sample that carry meaning and must survive
extraction, whether parsed or preserved verbatim:

- sire notes such as `(v. X)` / `(by X)`;
- relationship notes such as "full sister to …";
- free-text competition records with no year/placing grammar;
- an entry split across two consecutive paragraphs;
- meaningful paragraphs with no colon at all.

---

## 4. Indentation and structural evidence

Descendant nesting may be represented by **relative paragraph left indentation**: each
deeper `dam of:` level sits further right than its parent. Baseline B observed a small
set of distinct indentation steps in the sampled documents.

Those observed values are sample evidence, **not** a product invariant. A different
catalogue or year may use other steps.

Rules:

- extraction preserves source indentation and paragraph position as provenance;
- structural nesting is inferred from *relative* indentation together with paragraph
  order and explicit `dam of:` markers, robustly rather than from one fixed point
  lookup table;
- an unexpected indentation pattern is reported, never silently flattened.

---

## 5. Text-only descendants

Distant descendants frequently do not exist in `storehorse`. This is expected and
acceptable: they legitimately live only as library text with no `horse_id`.

A missing `horse_id` for a distant descendant is **not** an extraction error and must
not be reported as one. It also must not trigger creation of speculative horse
records.

---

## 6. Observed baselines

### 6.1 Duplication and resolution (validated real-catalogue samples)

Directional, not guaranteed.

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

### 6.2 Extractor Baseline B (2026-08-28) — SAMPLE_ONLY / OBSERVED BASELINE / NOT AN ACCEPTANCE THRESHOLD

A read-only baseline measured the current `extractor/parse_dams.py` prototype against
four real private catalogues spanning 2023–2026 (132 lots, roughly 4,200 source
entries). No corpus-wide validation was performed; nothing in this subsection is a
full-corpus accuracy figure.

What the sample showed:

- strong canonical grammar: table-bounded lots, `Nth Dam` headings, name-before-colon,
  `sj x.xxm (year)(rider)(COUNTRY)`, comma-separated `YYYY: pl` results and
  `(SEE ABOVE)` are handled well by the prototype;
- meaningful historical variants of every kind recorded in sections 2 and 3;
- **silent loss** in the prototype: no lot identity read from the table, no raw text or
  provenance retained, descendants collapsed to a boolean, pre-Dam content dropped,
  merged-heading entries dropped, no-colon paragraphs dropped, repeated ordinals merged,
  non-canonical results and levels lost or swallowed, studbook codes truncated,
  subject fields taken from descendants, and a fatal encoding failure on a Windows
  cp1252 console producing zero output.

Consequently the implementation measured here was a **partial prototype**. HOR-12
(2026-08-28) replaced it with the `extractor/maternal_line/` package, which implements
the extraction contract of section 8: source-block accounting, raw text and provenance
retention, structural descendants, explicit reporting of unsupported and ambiguous
structures, and Unicode-safe output. This baseline remains as the historical record of
what the prototype lost; it is not a measurement of the current extractor. Corpus-wide
consistency remains the job of the format consistency check that follows
productionisation.

### 6.3 Corpus format-consistency check (2026-08-29) — FULL LOCAL CORPUS / ACCOUNTING RECORD

HOR-11 ran the production extractor CLI (`extractor/parse_dams.py`) over the complete
local private corpus. Aggregate, anonymised record — no accuracy claim, no acceptance
threshold. It proves **accounting completeness**, not semantic correctness.

- **Corpus**: 33 files discovered, all readable, all distinct by SHA-256. One is an
  AutoRecovered near-duplicate of another: byte-different but identical on every
  structural counter, so it was deduplicated statistically. The authoritative variant
  of that pair remains unresolved; neither file was touched. Unless stated otherwise,
  figures below are over the 32 unique documents.
- **Execution**: 33 of 33 CLI runs exited 0. No document failed, none was skipped.
- **Zero silent loss, proven by the production ledger**: 40,094 meaningful source
  nodes = 40,006 `PARSED` + 59 `PRESERVED_UNPARSED` + 29 `EXPLICITLY_AMBIGUOUS` +
  0 `EXPLICITLY_UNSUPPORTED` + 0 `ERROR`; unaccounted 0; ledger missing, duplicate
  and unknown all 0 in every document. The reconciliation holds per document, not
  only in aggregate.
- **The non-parsed remainder is exactly the known variant classes**: the 59
  preserved-unparsed nodes are precisely the corpus's 59 no-colon paragraphs
  (section 3.11), and the 29 ambiguous nodes are precisely the repeated-ordinal Dam
  sections (section 2.5). Everything the prototype silently dropped is now accounted.
- **Structure counters match the recorded corpus baseline exactly**: 1,027 tables,
  1,022 first-Dam cells, 3,903 Dam headings, 38 merged heading+entry paragraphs,
  29 repeated ordinals, 93 pre-Dam paragraphs, 59 no-colon paragraphs.
- **Marker counters**: the baseline's `dam of` 11,412 and `see above` 763 are plain
  substring counts. The word-bounded grammar sees 10 fewer — the fused typo
  occurrences of sections 3.5 and 3.6, which are preserved unparsed by design.
- **Year counters**: the baseline's year figures could not be reproduced exactly
  because the original scan definition was not preserved; the closest reproducible
  definition agrees within ±0.2%, and the ledger proves independently that no year
  text was lost.

---

## 7. Identity resolution signals

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

## 8. Implications

### 8.1 Parsing

- Grammar handling stays separate from database persistence.
- Nesting under `dam of:` must be represented structurally.
- `(SEE ABOVE)` is resolved as a reference, never expanded into duplicated content.
- `etc.` requires contextual interpretation.
- Unsupported or malformed structures fail explicitly and are reported. They are never
  skipped silently.

**No-silent-loss contract.** Unknown or unsupported source must not silently become
"no data". For every meaningful paragraph or segment belonging to an extracted lot,
exactly one of the following holds and is visible in the extraction output:

```txt
PARSED
PRESERVED_UNPARSED
EXPLICITLY_UNSUPPORTED
EXPLICITLY_AMBIGUOUS
ERROR
```

Never: silently discarded. Production readiness does not mean every historical sentence
has a dedicated parser. It means known grammar is structured and unknown meaningful
source survives visibly, without becoming false certainty or disappearing.

### 8.2 Provenance

Every extracted entry retains its source document, source section, source position,
extraction run, import timestamp, and parser version — see FR-006. For extraction
output specifically, enough source representation must survive to explain:

- which paragraph produced an entry;
- where it appeared (lot, section, occurrence, order);
- what the original source text was;
- relevant formatting or indentation where structurally meaningful.

Persistence table names are not defined here.

### 8.3 Errors and ambiguity

- Unsupported structures are reported, not discarded.
- Ambiguous identity produces a review item with the source text and the candidate
  list preserved.
- Conflicting texts for the same resolved mare preserve every variant and create a
  conflict review item. Nothing is overwritten silently.

### 8.4 Human review

Human review is a first-class workflow, not an error path. Missing, ambiguous and
conflicting cases are expected outputs of a correct extraction run.

### 8.5 Platform and encoding

Source documents and extracted text contain characters outside Latin-1. Extraction
output must be Unicode-safe regardless of the active console code page, and a fatal
I/O or encoding failure must end the run with a deterministic non-zero status. A
zero-byte result is never a successful extraction.

---

## 9. Testing

Grammar behaviour, edge cases, identity resolution and conflict handling are developed
with TDD, using anonymised or explicitly approved fixtures. Real client documents stay
under `data/private/` and are never committed.

The observed variants in sections 2, 3 and 4 are the regression classes: each has a
synthetic fixture that reproduces the structure without any private text.
