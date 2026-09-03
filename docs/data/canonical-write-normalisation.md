# Canonical Write Normalisation

**Owner issue:** HOR-154. **Governing decisions:**
[ADR-018](../adr/ADR-018-storehorse-canonical-registry-and-word-authoritative-ingestion.md)
(exact source preservation + conservative canonical interpretation, safe creation
contract), [ADR-005](../adr/ADR-005-canonical-writeup-library.md) (one canonical write-up
per mare), [writeup-grammar.md §7](../domain/writeup-grammar.md) (approved name
comparison policy, HOR-14/HOR-152).

This document defines **what every canonical write path must do to a value before it is
persisted** — Word ingestion (HOR-13), future administrator forms, future Excel imports
(HOR-18), any API write. It holds no work status. The shared implementation is
`server/canonical/writeNormalisation.ts`; its tests
(`server/canonical/writeNormalisation.test.ts`) pin the contract.

---

## 1. Three representations, never merged

Every canonical value has up to three representations. **None replaces another.**

| Representation | What it is | Where it lives |
|---|---|---|
| **Source / raw value** | Exactly what the source or administrator supplied, byte for byte | The provenance ledger — `source_assertion.subject_name_raw`, `raw_text`, `competition_history.raw_source_segment` (zero-loss, ADR-018) |
| **Canonical display value** | The stored authoritative presentation value | The canonical tables — `storehorse.name`, `competition_history.rider`, `event_name`, `canonical_writeup.content` |
| **Comparison / identity key** | A derived, in-memory form used only to compare and generate candidates | Nowhere as a value — computed by `horseNameKey` (and `writeupContentHash` for narrative reuse) when needed |

The rejected alternative — "store everything lowercase" — collapses the display value
into the comparison key and destroys presentation information Marcus's catalogues carry
(KWPN, J.B., van 't Hof, Rêve d'Été). Case-folding is a **comparison** concern; it never
becomes storage.

## 2. The contract

Binding for every canonical write:

1. **Normalisation is additive, not destructive.** The raw value is preserved through
   the assertion ledger before any canonical interpretation; a display value is derived
   from it, never the reverse.
2. **Display normalisation is whitespace-only**: trim outer whitespace, collapse
   internal whitespace runs to one space. Casing, punctuation, accents, hyphens and
   studbook suffixes are content and are never rewritten
   (`normaliseHorseName`, grammar §7 — every stronger transformation measured
   net-negative on the registry).
3. **Comparison keys are derived and never stored as the value.** `horseNameKey` =
   display form → lowercase → U+2019→U+0027 fold (HOR-152). It exists to find
   candidates and duplicates; equality of keys never assigns identity by itself
   (HOR-14 rules decide).
4. **Narrative text is never case- or word-normalised.** Write-ups get the
   formatting-only sanitation of `normaliseWriteupContent` (NFC, CRLF→LF, per-line
   whitespace runs, blank-line cap); `writeupContentHash` decides reuse vs conflict.
   Conflicting write-ups are never overwritten (ADR-005).
5. **Categorical values resolve against the existing closed vocabularies** — lookup
   tables, junctions and enums. An unknown or differently-cased variant is rejected or
   preserved as a source fact; it never becomes a new canonical category silently
   (`mapResultKind`: unknown → `UNKNOWN_PLACING_KIND`).
6. **Relationships are ids, not text.** Pedigree is only `storehorse.sire_id` /
   `dam_id`; what a source *says* about parentage stays a `PEDIGREE_DAM` /
   `PEDIGREE_SIRE` assertion between resolved ids.
7. **The server is the boundary.** Client-side formatting is a convenience; the values
   persisted are the ones this contract produced server-side. Frontend input is
   untrusted.
8. **Every function in the boundary is deterministic, idempotent, pure and
   database-free**: `f(f(x)) = f(x)`, same input → same output, no I/O.

Normalisation is one of four distinct responsibilities and takes over none of the
others: **validation** (is the value acceptable?), **identity resolution** (which horse
is this? — HOR-14), and **persistence-state accounting** (what happened to the
assertion? — the seven zero-loss states) each keep their own rules.

## 3. Field-class matrix

Classes: `CANONICAL_DISPLAY_TEXT` (trim + collapse only), `CANONICAL_RELATION` (resolved
id), `STRUCTURED_ENUM_OR_LOOKUP` (closed vocabulary), `VALIDATED_SCALAR` (typed value,
representation-normalised at the edge), `PRESERVE_HUMAN_TEXT` (formatting-only),
`PRESERVE_SOURCE_RAW` (verbatim), `DERIVED_KEY` (computed, deterministic).

| Field | Class | Canonical form | Raw preserved in | Comparison |
|---|---|---|---|---|
| Horse name (`storehorse.name`) | CANONICAL_DISPLAY_TEXT | `normaliseHorseName` — trim + collapse, ≤100 chars width-validated, case/punctuation/accents untouched | `source_assertion.subject_name_raw` | `horseNameKey`, in memory |
| Dam | CANONICAL_RELATION | `storehorse.dam_id` (0 = unknown sentinel) | `PEDIGREE_DAM` assertion (`raw_text`, names) | id equality |
| Sire | CANONICAL_RELATION | `storehorse.sire_id` (0 = unknown sentinel) | `PEDIGREE_SIRE` assertion | id equality |
| Birth year | VALIDATED_SCALAR | integer; `"2018"` → `2018` at the API edge; interim usability screen 1900–2030 (HOR-14) — final plausibility rule owned by HOR-144 | assertion `raw_text` | numeric |
| Sex | STRUCTURED_ENUM_OR_LOOKUP | `sexe` FK; **not interpreted from sources in v1** (grammar §7.1) — semantics owned by HOR-150; resolver treats unknown as UNKNOWN | assertion `raw_text` | id |
| Colour | Categorical concept, currently free text | `storehorse.color` varchar(20); no current canonical writer sets it from sources; a future writer must resolve against a controlled vocabulary (mapping = future issue; `tbl_color` exists but is not an FK target — no new registry now) | assertion `raw_text` | — |
| Country | VALIDATED_SCALAR | code as extracted, width-validated (varchar(3)), never invented | `raw_source_segment` | code equality |
| Discipline | STRUCTURED_ENUM_OR_LOOKUP | `diciplinevalues` + junction; `competition_history.discipline_code` stays NULL under extractor output contract 1 (never guessed) | `raw_source_segment` | id / code |
| Studbook | CANONICAL_RELATION | `studbook` + `studbook_has_storehorse` junction; source claim = `STUDBOOK` assertion | assertion `raw_text` | id |
| Approval | CANONICAL_RELATION | `approvedby` + junction; source claim = `APPROVAL` assertion | assertion `raw_text` | id |
| Rider | CANONICAL_DISPLAY_TEXT | `normaliseCanonicalTextField` — trim + collapse, no case change, blank → NULL | `raw_source_segment` | — |
| Competition result kind | STRUCTURED_ENUM_OR_LOOKUP | `result_kind` closed enum `PLACED \| WON \| COMPETED` via `mapResultKind`; unknown vocabulary rejected, never coerced | `raw_source_segment` | enum |
| Competition level | VALIDATED_SCALAR | `level_code` as extracted, width-validated varchar(20) | `raw_source_segment` | code equality |
| Competition raw segment | PRESERVE_SOURCE_RAW | verbatim — `raw_source_segment` **is** the raw layer | itself | — |
| Canonical write-up | PRESERVE_HUMAN_TEXT | `normaliseWriteupContent` — formatting only; case, words, punctuation are content | source document + assertion | `writeupContentHash` |
| Preserved source fact | PRESERVE_SOURCE_RAW | `source_assertion.raw_text` verbatim + `interpreted_payload` | itself | `assertion_key` |
| Identifiers (`assertion_key`, `run_key`, `content_fingerprint`) | DERIVED_KEY | deterministic hashes (`server/ingestion/keys.ts`) | n/a | exact |

## 4. Physical comparison-key column: NOT_REQUIRED_NOW

A physical `storehorse.name_key` column was considered and rejected for now:

- Candidate generation derives keys **in memory** over the loaded registry
  (`server/identity/storehorseIndex.ts`); no query needs a SQL-side key.
- `identity_review_case.name_key` is a **decision-time snapshot** for audit, not a
  registry index, and does not generalise.
- A stored key would be a second copy of derivable data that can silently drift from
  `name` and from the key algorithm version.

**FUTURE_OPTIMISATION:** if SQL-side candidate generation is ever needed at scale, add
the column then — generated from `name` by the same algorithm, with its own issue,
migration and backfill plan. Nothing in this contract blocks that.

## 5. Shared implementation

`server/canonical/writeNormalisation.ts` is a thin façade, not a second normaliser:

- re-exports `normaliseHorseName` / `horseNameKey` (`server/identity/nameKey.ts` — the
  single name implementation, unchanged),
- re-exports `normaliseWriteupContent` / `writeupContentHash`
  (`server/ingestion/writeup.ts`),
- adds `normaliseCanonicalTextField` for short nullable display fields (rider, event
  name): the same display policy, blank → NULL — delegating to `normaliseHorseName` so
  trim-and-collapse has exactly one implementation.

Future write paths import from `server/canonical/writeNormalisation` and inherit the
contract; the reference-equality tests make silent divergence impossible.
