# Horse & Breeder — Automation MVP Requirements

**Status:** Active  
**Owner:** Sammy Maldonado  
**Execution tracking:** Linear project `horseandbreeder`, team `horseandbreeding`, prefix `HOR-`

**Related:** [../adr/](../adr/) · [../domain/writeup-grammar.md](../domain/writeup-grammar.md) · [../data/hbold-baseline.md](../data/hbold-baseline.md) · [../architecture/existing-assets.md](../architecture/existing-assets.md)

This document holds stable product scope and domain rules. Linear holds work status,
ownership, and priority — never copied here.

---

## 1. Purpose

Automate the production of one-page sport-horse auction pedigree catalogues.

Each deliverable combines:

1. A pedigree table.
2. Maternal-line write-ups (`1st Dam`, `2nd Dam`, `3rd Dam`, and deeper when available).
3. Notable offspring and competition results.
4. A professional PDF suitable for delivery to auction houses.

The existing system already contains useful pedigree and search functionality. The Automation MVP must finish the missing data pipeline rather than rewrite the application.

---

## 2. Primary Users

### Marcus

Non-technical business operator who:

- prepares auction catalogues;
- supplies Excel and Word source files;
- reviews ambiguous or missing write-ups;
- generates final PDFs.

### Sammy

Technical owner who:

- maintains the application;
- owns extraction, identity resolution, migration, and automation;
- validates architecture and data safety.

---

## 3. Business Objective

Replace repeated manual copy/paste with a reusable, traceable pipeline:

```txt
historical Word catalogues
→ structured extraction
→ identity resolution
→ canonical write-up library
→ automatic report assembly
→ professional PDF
→ human review only when required
```

Success means a whole auction of approximately 25–50 foals can be processed in minutes rather than hours.

### Operator flow

The workflow Marcus performs:

```txt
search a horse  OR  upload the auction Excel
→ pedigree table assembled from storehorse.dam_id / sire_id
→ maternal-line write-ups pulled from the canonical library by walking dam_id
→ professional PDF, single or batch
→ review queue for missing, ambiguous, and conflicting cases only
```

---

## 4. In Scope

### 4.1 Foundation

- Adopted Nuxt application running locally.
- Local MariaDB/MySQL reference environment.
- Safe Prisma compatibility workflow.
- Test harness.
- Security baseline.
- Private source-data workspace.

### 4.2 Data model and migration

- Preserve verified `storehorse` pedigree relations.
- Define a canonical write-up library.
- Store source provenance.
- Store structured competition results where appropriate.
- Provide repeatable, idempotent migration scripts.

### 4.3 Word extraction

- Parse historical `.docx` catalogues.
- Extract dam sections and nested offspring.
- Parse names, discipline, level/height, rider, country, birth year, event/class details, approvals, `dam of:`, `(SEE ABOVE)`, and `etc.`.
- Report unsupported or malformed structures.
- Validate consistency across documents and years.
- Support bulk ingestion after single-document quality is proven.

### 4.4 Identity resolution

- Resolve extracted maternal-line horses to `storehorse.horse_id`.
- Match by normalised name, then birth year, then sire/dam context.
- Route ambiguous matches to review.
- Never silently assign uncertain identities.

### 4.5 Report generation

- Walk the maternal line through `dam_id`.
- Pull canonical write-ups.
- Flag missing or conflicting content.
- Generate a professional PDF.
- Import an auction Excel and generate all reports in batch.

### 4.6 Human review

- Show missing, ambiguous, and conflicting cases.
- Allow approved correction of canonical write-ups.
- Preserve provenance and audit history.
- Provide search and horse-detail views.

### 4.7 Hardening and handover

- Security review.
- Deployment and operating documentation.
- End-to-end demo with a real catalogue.
- Measured comparison of manual versus automated time.

---

## 5. Out of Scope

Unless an approved Linear issue and ADR explicitly change scope:

- Rewrite from scratch.
- Construction-company systems.
- External scraping or automated enrichment.
- Marketplace or e-commerce features.
- New billing model or Stripe product design.
- New database engine.
- Replacement ORM.
- Multi-tenant SaaS redesign.
- Automatic resolution of ambiguous identities.
- Destructive removal of legacy schema elements.
- Production migration before local repeatability is proven.

---

## 6. Functional Requirements

### FR-001 — Import a Word catalogue

The system must accept a `.docx` catalogue and create an extraction report.

The report must include:

```txt
document identifier
horses/sections detected
entries parsed
entries skipped
unsupported structures
ambiguous references
conflicts
errors
```

No source file may be modified.

### FR-002 — Parse dam sections

The extractor must recognise:

```txt
1st Dam
2nd Dam
3rd Dam
4th Dam
5th Dam and deeper when present
```

Each section must retain its heading, source order, raw source reference, and parsed entries.

### FR-003 — Parse write-up entries

Where present, parse:

```txt
horse name
discipline
competition height/level
birth year
rider
country
event year
placing
event name
class
approval/studbook
offspring introduced by "dam of:"
reuse reference "(SEE ABOVE)"
entry terminator or continuation such as "etc."
```

Unsupported structures must be explicit, not silently discarded.

### FR-004 — Resolve horse identity

Resolution cascade:

1. Normalised exact name.
2. Birth year.
3. Sire name.
4. Dam name.
5. Human review.

Automatic assignment must meet the approved confidence rules.

Ambiguous matches must create a review item.

### FR-005 — Create canonical write-ups

Each resolved mare may have at most one canonical write-up.

Repeated source text must reference the canonical record rather than create duplicates.

Conflicting source texts must:

- preserve all source variants;
- create a review item;
- never overwrite silently.

### FR-006 — Preserve provenance

Every imported write-up or structured result must retain enough provenance to identify:

```txt
source document
source section
source position or paragraph reference
extraction run
import timestamp
parser version
```

### FR-007 — Assemble a horse report

Given a foal or horse identifier, the system must:

1. Load the pedigree.
2. Walk the maternal line through `dam_id`.
3. Load canonical write-ups.
4. Mark missing, ambiguous, or conflicting sections.
5. Produce a report model suitable for PDF generation.

### FR-008 — Generate professional PDF

The generated PDF must:

- contain pedigree and maternal-line content;
- use consistent professional typography and spacing;
- preserve meaningful emphasis;
- be downloadable;
- be visually validated by Marcus;
- avoid silent truncation.

### FR-009 — Import auction Excel

The system must accept the stable auction Excel columns:

```txt
name
age
sire
dam
colour
sex
```

It must:

- preview detected rows;
- match rows to the database;
- create a not-found/review queue;
- never silently drop a row;
- generate a batch of PDFs.

### FR-010 — Review queue

The review interface must support:

```txt
missing
ambiguous
conflict
```

A saved approved correction must update the canonical library and unblock affected reports.

### FR-011 — Search and horse detail

Marcus must be able to:

- search by horse name;
- disambiguate same-name horses with year and parent context;
- view pedigree;
- view maternal line;
- view canonical write-up and provenance.

### FR-012 — Repeatable ingestion

Single and bulk ingestion must be:

```txt
idempotent
resumable
auditable
safe to re-run
```

Re-running must not duplicate records.

---

## 7. Business Rules

- **BR-001 — Pedigree chain:** `storehorse.dam_id` and `storehorse.sire_id` are the pedigree source of truth unless an approved migration changes them.
- **BR-002 — Maternal traversal:** The maternal line is traversed through `dam_id`.
- **BR-003 — Canonical write-up:** One resolved mare has at most one approved canonical write-up.
- **BR-004 — No silent ambiguity:** Ambiguous identity matches are never auto-assigned.
- **BR-005 — No silent overwrite:** Conflicting write-ups are preserved and reviewed.
- **BR-006 — No silent row loss:** Every Excel row and source section must appear as processed, skipped with reason, or failed.
- **BR-007 — Provenance:** Imported content must be traceable to its source.
- **BR-008 — Source immutability:** Original Word and Excel files are read-only inputs.
- **BR-009 — Private data:** Real client source files stay under `data/private/` and are never committed.
- **BR-010 — Schema preservation:** Absence from `hbold` is not sufficient evidence to remove a Prisma model or field.
- **BR-011 — Idempotency:** Repeat execution must not create duplicate canonical data.
- **BR-012 — Review before publication:** Reports containing unresolved required content cannot be treated as final.

---

## 8. Key Acceptance Scenarios

### Scenario A — Repeated write-up reuse

```gherkin
GIVEN two foals share the same mare in their maternal line
AND the mare has an approved canonical write-up
WHEN both reports are assembled
THEN both reports reference the same canonical write-up
AND no duplicate write-up record is created
```

### Scenario B — Ambiguous horse identity

```gherkin
GIVEN an extracted horse name matches multiple database horses
WHEN birth year and parent context do not resolve the match
THEN no horse_id is assigned automatically
AND a review item is created
AND the source text and candidates are preserved
```

### Scenario C — Conflicting source texts

```gherkin
GIVEN two source documents contain different write-ups for the same resolved mare
WHEN the second source is imported
THEN the approved canonical text is not overwritten
AND both source variants are preserved
AND a conflict review item is created
```

### Scenario D — Batch Excel import

```gherkin
GIVEN a valid auction Excel with 25 to 50 rows
WHEN the file is imported
THEN every row appears in the preview or error report
AND matched horses can generate reports
AND unmatched horses enter a review queue
AND no row is silently dropped
```

### Scenario E — Safe re-run

```gherkin
GIVEN a catalogue was previously imported
WHEN the same catalogue is imported again
THEN no duplicate canonical write-ups are created
AND the run completes with an idempotent report
```

### Scenario F — Missing write-up

```gherkin
GIVEN a maternal-line mare has no approved canonical write-up
WHEN a report is assembled
THEN the section is marked missing
AND the report is not silently presented as complete
AND a review item can be created
```

---

## 9. Conceptual Entities

These are product concepts, not permission to alter Prisma without an approved issue.

- **Horse:** Existing pedigree entity represented by `storehorse`.
- **CanonicalWriteUp:** Approved reusable text associated with a resolved mare.
- **SourceDocument:** A Word or Excel input with provenance metadata.
- **ExtractionRun:** One parser execution and its result summary.
- **ExtractedEntry:** Raw/structured entry produced by the parser before final resolution.
- **IdentityMatch:** Resolution result with confidence, evidence, candidates, and review state.
- **CompetitionResult:** Structured competition information linked to a horse or write-up.
- **ReviewItem:** A missing, ambiguous, or conflicting case requiring human action.
- **Report:** Assembled pedigree and maternal-line content for one horse.
- **AuctionBatch:** One Excel import and the reports/results generated from it.

---

## 10. Non-Functional Requirements

- **NFR-001 — Traceability:** Every code change maps to a Linear issue and commit.
- **NFR-002 — Testability:** Parser, identity, canonicalisation, assembly, migration, and compatibility logic are covered by automated tests.
- **NFR-003 — Data safety:** No destructive production operation without approval, backup, and rollback.
- **NFR-004 — Security:** Protected endpoints require authentication and validated input.
- **NFR-005 — Privacy:** Private client documents are never committed or publicly exposed.
- **NFR-006 — Maintainability:** Architecture decisions are recorded in ADRs.
- **NFR-007 — Repeatability:** Local setup and migrations are documented and reproducible.
- **NFR-008 — Explainability:** Automatic matching and review decisions retain evidence.
- **NFR-009 — Usability:** Marcus-facing UI uses plain English and avoids technical jargon.
- **NFR-010 — Performance:** A batch of 25–50 reports should complete in operationally acceptable minutes, not manual hours. Exact targets must be measured before final delivery.

---

## 11. EPIC Mapping

```txt
HOR-1  Foundation & Setup
HOR-6  Database Redesign & Migration
HOR-10 Word Extractor
HOR-15 Report Generation
HOR-19 Review UI & Modern UX
HOR-23 Hardening & Handover
```

Linear contains executable stories and acceptance criteria.

This file contains stable product scope and domain rules.

---

## 12. Definition of Done — Automation MVP

The MVP is complete when:

- the adopted Nuxt application remains the product base;
- the local database and Prisma workflow are reproducible;
- historical Word catalogues can be parsed with explicit reports;
- identity resolution meets the approved threshold and routes ambiguity to review;
- canonical write-ups are reused rather than duplicated;
- conflicting sources are preserved and reviewed;
- one horse report can be assembled automatically;
- a professional PDF is generated and approved;
- a full auction Excel can generate a batch without silent row loss;
- review workflows support missing, ambiguous, and conflicting cases;
- security and private-data checks pass;
- documentation and deployment instructions are complete;
- Marcus validates the end-to-end workflow with a real catalogue;
- manual versus automated time is measured;
- no unresolved critical issue is hidden or falsely closed.
