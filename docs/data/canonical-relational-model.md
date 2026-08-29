# Canonical Relational Model Around `storehorse`

**Owner issue:** HOR-9 (US-011). **Governing decisions:**
[ADR-018](../adr/ADR-018-storehorse-canonical-registry-and-word-authoritative-ingestion.md)
(single canonical registry, Word-authoritative ingestion, safe creation contract),
[ADR-005](../adr/ADR-005-canonical-writeup-library.md) (one canonical write-up per mare),
[ADR-017](../adr/ADR-017-separate-catalogue-ingestion-from-report-serving.md) (ingestion
never serves reports), [ADR-012](../adr/ADR-012-prisma-migrate-baseline-and-staged-innodb-modernisation.md)
(Prisma Migrate baseline, deferred foreign keys), [ADR-003](../adr/ADR-003-prisma-schema-preservation.md)
(nothing removed on the strength of `hbold`).

This document describes the **persisted shape** HOR-9 added and the decisions behind it.
It holds no work status. The Prisma definitions in `prisma/schema.prisma` are the code
truth; this document explains why they look the way they do.

---

## 1. Invariants the model enforces

- `storehorse` is **the** canonical horse registry, keyed by `horse_id`. No new table
  stores a horse identity; every new table points at `storehorse.horse_id` or at nothing.
- The pedigree chain stays **`storehorse.sire_id` / `storehorse.dam_id`**. No table
  duplicates parentage; what a source *says* about parentage is a `source_assertion`
  (`PEDIGREE_DAM` / `PEDIGREE_SIRE`) that links two existing `horse_id`s.
- A mare has **at most one** canonical write-up: `canonical_writeup.horse_id` is UNIQUE.
- **Nothing extracted is lost.** Every extracted item ends as a `source_assertion` row in
  exactly one persistence state (§5), whether or not it could be canonicalised.
- **Identity resolution never creates a horse blindly.** An assertion that is
  `AMBIGUOUS`, `CONFLICT` or unresolved keeps `horse_id = NULL`; a canonicalised state
  cannot exist without a `horse_id` (`server/ingestion/persistenceState.ts`).
- The migration is **additive only**: no table, column, row, index or relation of the
  pre-existing schema was dropped, renamed or rewritten.

---

## 2. Classification of the existing schema

| Existing structure | Decision | Why |
|---|---|---|
| `storehorse` (identity, `sire_id`, `dam_id`, `mareline_id`, birth year, sex, colour, breeder…) | **REUSE_AS_IS** | The canonical registry. Not touched by HOR-9 — its `dam_id` nullability drift is a separate issue (§8). |
| `approvedby`, `studbook`, `diciplinevalues`, `sexe`, `tbl_color` and the junctions `storehorse_has_approvedby`, `studbook_has_storehorse`, `storehorse_has_diciplinevalues` | **REUSE_AS_IS** | Already the relational home of approvals, studbooks, disciplines, sex and colour. Source evidence for them is an assertion (`APPROVAL`, `STUDBOOK`, `DISCIPLINE`); a canonical change to a junction is audited (`APPROVAL_LINK`, `STUDBOOK_LINK`, `DISCIPLINE_LINK`). Their duplicate pairs are a separate issue (§8). |
| `competition_history` | **REUSE_WITH_TARGETED_EVOLUTION** | Already stores sport results with `storehorse_id` = the horse that achieved them. Gained nine nullable columns (§3.2); all 454 legacy rows survive with those columns `NULL`. |
| `storehorse.remarks`, `storehorse.description` | **DO_NOT_REUSE as canonical text** | Incomplete, no provenance, no lifecycle (ADR-005). Legacy content stays where it is; HOR-8 decides the backfill. |
| `storehorse_new`, `marcustest`, `_legacy/` | **DO_NOT_REUSE** | Reference/pollution only (existing-assets.md §6). Never a registry, never read at runtime. |
| Write-up library, source documents, runs, assertions, audit | **NEW_RELATIONAL_CAPABILITY_REQUIRED** | Nothing in the schema modelled provenance, runs, zero-loss states or canonical text (§3). |

---

## 3. The model

Relation names below are Prisma model names (`@@map` is not used; table = model).

### 3.1 New tables (InnoDB, `utf8mb4_unicode_ci`)

| Table | One row is | Key columns |
|---|---|---|
| `source_document` | A registered ingestion source — metadata only, **never the document binary** | `document_key` UNIQUE (the extractor `document_id`), `content_fingerprint` UNIQUE (hex SHA-256 of the bytes), `document_type`, `catalogue_name`, `catalogue_year`, `source_reference` (private path under `data/private/`, never exposed), `byte_size` |
| `ingestion_run` | One extractor + canonicalisation execution over one document | `run_key` UNIQUE = `<fingerprint>:<extractor_version>:<output_contract_version>` (deterministic → idempotent re-runs), `run_status`, node accounting (`total_source_nodes`, `accounted_nodes`, `unaccounted_nodes`), `accounting_summary` JSON, `error_summary` |
| `canonical_writeup` | The one canonical maternal write-up of one mare (ADR-005) | `horse_id` UNIQUE → `storehorse`, `content`, `content_hash` (SHA-256 of the normalised text), `lifecycle_state` `IMPORTED \| APPROVED \| CORRECTED`, `version`, `source_document_id`, `ingestion_run_id`, `approved_by`, `approved_at` |
| `source_assertion` | One claim made by one source at one exact position — the zero-loss evidence ledger | `assertion_key` UNIQUE (SHA-256 of fingerprint + node + kind + ordinal; run-independent), source coordinates (`node_id`, `block_index`, `lot_order`, `section_ordinal`, `section_occurrence`, `item_order`, `chain_index`, `segment_index`, `text_offset`, `nesting_depth`), `assertion_kind`, `subject_name_raw` / `subject_name_normalised`, `raw_text`, `interpreted_payload` JSON, `persistence_state`, `state_reason`, `resolution_outcome`, `horse_id?`, `related_horse_id?`, `writeup_id?`, `competition_history_id?`, decision columns |
| `canonical_change_audit` | One canonical change made from evidence | `ingestion_run_id`, `source_assertion_id`, `horse_id`, `target_kind`, `target_id`, `field_name`, `previous_value`, `new_value`, `change_kind` `CREATED \| UPDATED \| CONFIRMED \| REVERTED`, `decided_by` |

The audit row carries the previous value, the new value, the decision and the run, so
one ingestion run can be reversed by its context without re-reading any document.

### 3.2 `competition_history` — additive evolution

New nullable columns (NULL on every legacy row): `discipline_code`, `result_kind`
(`PLACED | WON | COMPETED`, mirroring the extractor placing vocabulary), `event_name`,
`level_code`, `participation` (`INDIVIDUAL | TEAM`), `country_code`, `raw_source_segment`,
`ingestion_run_id` (FK → `ingestion_run`, indexed), `canonicalisation_state`.

The legacy columns keep their meaning: `storehorse_id` is the horse that achieved the
result, `competition_year`, `placed_in_competition`, `detail`, `height`, `rider`. Output
contract 1 of the extractor carries no discipline, event or participation for a result,
so `server/ingestion/competitionResult.ts` leaves those three NULL rather than guessing.
The table is `latin1`; the new free-text columns are declared `utf8mb4` explicitly.

### 3.3 Relations towards `storehorse`

`canonical_writeup.horse_id`, `source_assertion.horse_id`, `source_assertion.related_horse_id`
and `canonical_change_audit.horse_id` are declared in Prisma for typed navigation. Their
`FOREIGN KEY` statements are **deferred** in the migration because `storehorse` is still
MyISAM (an InnoDB child → MyISAM parent constraint fails with errno 150). This is the same
class as `competition_history.storehorse_id` and is recorded in the ADR-012 deferral list
([hbold-baseline.md](hbold-baseline.md) §7.1). The application enforces the links until a
later ADR-012 wave converts `storehorse`.

---

## 4. Business information classes

The Word catalogues carry four classes of information. Each has exactly one canonical
home, and every occurrence keeps its provenance as a `source_assertion`.

| Class | Content | Canonical home | Assertion kinds |
|---|---|---|---|
| **A — Structured horse facts** | identity, birth year, dam, sire, descendants, approvals, studbook, discipline, sex, colour | `storehorse` columns and the existing lookups/junctions (write path owned by HOR-13; resolver by HOR-14) | `SUBJECT_IDENTITY`, `BIRTH_YEAR`, `PEDIGREE_DAM`, `PEDIGREE_SIRE`, `DESCENDANT_LINK`, `APPROVAL`, `STUDBOOK`, `DISCIPLINE` |
| **B — Sport results** | year, placing/won/competed, level, height, rider, country, event | `competition_history` (one row per result, `storehorse_id` = achiever) | `COMPETITION_RESULT`, `SPORT_LEVEL`, `RIDER`, `COUNTRY` |
| **C — Maternal write-up text** | the mare's narrative block | `canonical_writeup` (one per mare) | `MATERNAL_WRITEUP`, `SEE_ABOVE_REFERENCE` (a reference, never content), `SIRE_NOTE`, `HEAD_NOTE` |
| **D — Everything else** | free text, structures the grammar does not support, extraction errors | **no canonical column** — the assertion itself, in state `PRESERVED_SOURCE_FACT`, `EXPLICITLY_UNSUPPORTED` or `ERROR` | `FREE_TEXT`, `UNSUPPORTED_STRUCTURE`, `EXTRACTION_ERROR` |

Class D is deliberately **not** an entity–attribute–value store: `assertion_kind` is a
closed enum derived from the write-up grammar, `interpreted_payload` is structured JSON
attached to a known kind, and a new kind of fact requires a schema change, not a new row
in a "types" table.

---

## 5. Zero-loss persistence states

`ingestion_persistence_state` widens the extractor's five accounting statuses
(`PARSED`, `PRESERVED_UNPARSED`, `EXPLICITLY_UNSUPPORTED`, `EXPLICITLY_AMBIGUOUS`,
`ERROR`) into seven, because a parsed item still has to survive identity resolution:

| State | Meaning | `horse_id` |
|---|---|---|
| `CANONICALISED_STRUCTURED` | value written to a canonical column or row | required |
| `CANONICALISED_RELATIONSHIP` | link between two canonical records (dam, sire, descendant, approval, studbook, discipline, see-above) | required |
| `PRESERVED_SOURCE_FACT` | kept verbatim, not canonicalised (unparsed, or resolution not attempted) | NULL |
| `AMBIGUOUS` | identity could not be chosen — review (HOR-142); never inserted, merged or assigned | NULL |
| `CONFLICT` | contradicts the database or another document — every assertion preserved; review | NULL |
| `EXPLICITLY_UNSUPPORTED` | structure the grammar refuses on purpose | NULL |
| `ERROR` | extraction failure recorded as a fact | NULL |

`ingestion_run` records `total_source_nodes` against `accounted_nodes`; a run is complete
only when `unaccounted_nodes = 0` (`summariseAccounting`).

Cross-document reuse: many assertions may point at one canonical fact (one
`canonical_writeup`, one `competition_history` row, one `horse_id`). A second document
that repeats a mare's text creates one more assertion at the same `writeup_id`; a
differing text is a `CONFLICT` assertion — the stored write-up is never overwritten.

---

## 6. Keys and determinism

| Key | Built from | Property |
|---|---|---|
| `source_document.content_fingerprint` | SHA-256 of the document bytes (`contentFingerprint`) | the same file registers once |
| `ingestion_run.run_key` | fingerprint + extractor version + output contract version (`buildRunKey`) | re-running the same extractor over the same file is a no-op; a new extractor version is a new run |
| `source_assertion.assertion_key` | fingerprint + node id + kind + ordinal (`buildAssertionKey`) | the same claim from the same file dedupes across runs |
| `canonical_writeup.content_hash` | SHA-256 of the normalised text (`writeupContentHash`) | identical-after-normalisation ⇒ reuse; different ⇒ conflict |

Normalisation is formatting-only (NFC, line endings, whitespace runs); case, words and
punctuation are content.

---

## 7. What HOR-9 deliberately does not do

- No write path into `storehorse`, no identity resolver (HOR-14), no bulk pipeline
  (HOR-13), no review items or review UI (HOR-142, HOR-22), no assembly (HOR-17), no PDF
  (HOR-16), no Excel import (HOR-18).
- No backfill of existing text (`HOR-8`).
- No DOCX binary in the database; no real filenames, horse names or catalogue text in
  fixtures or tests.
- No change to `storehorse`, no junction deduplication, no nullability fix (§8).

Pure rule modules live under `server/ingestion/` (`types.ts`, `keys.ts`, `writeup.ts`,
`persistenceState.ts`, `competitionResult.ts`) with tests beside them; none of them
touches Prisma, Nitro or a database. `prisma/canonical-relational-model.test.ts` gates
the schema and the migration text (additive, nullable, no second registry) without a
database, so CI never needs `hbold`.

---

## 8. Findings deferred to their own issues

| Finding | Why not here | Tracked in |
|---|---|---|
| `storehorse.dam_id` is `Int?` in Prisma and nullable in the live database while the baseline DDL says `NOT NULL DEFAULT 0` | a nullability change on the registry is not additive and touches the pedigree chain | HOR-146 |
| `storehorse_has_approvedby` (52) and `studbook_has_storehorse` (16,696) duplicate pairs block the composite primary keys | deduplication is a destructive, unauthorised decision (ADR-012) | HOR-147 |
| Four relations towards `storehorse` cannot be enforced while it is MyISAM | ADR-012 wave, not an HOR-9 decision | ADR-012 deferral list, [hbold-baseline.md](hbold-baseline.md) §7.1 |
