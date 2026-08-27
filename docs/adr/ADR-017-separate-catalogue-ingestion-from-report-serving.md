# ADR-017: Separate Catalogue Ingestion from Report Serving

**Status:** Accepted
**Date:** 2026-08-27
**Deciders:** Sammy Maldonado

---

## Context

Marcus's historic catalogue information exists in private Word files under
`data/private/`. The Automation MVP must turn that material into automated horse
reports.

Parsing those files on every report request would couple report serving to private
documents, increase latency, reduce reproducibility, and make auditing harder. It would
also leave no place for approved human corrections to live, because every run would
re-derive content from the raw source.

[ADR-005](ADR-005-canonical-writeup-library.md) already rejects request-time generation
for **write-ups** specifically and defines the canonical write-up library. What no ADR
records is the general architectural separation for the whole product: which side of the
system the Word corpus belongs to, and what report serving is allowed to read.

---

## Decision

The system has two architecturally separate paths. Historical Word catalogues belong to
the first and never to the second.

**Ingestion path** (offline, repeatable, auditable):

```txt
Word catalogue
→ parser/extractor
→ structured data
→ identity resolution
→ canonical persisted data + provenance
```

**Serving path** (product runtime):

```txt
horse_id
→ relational database
→ pedigree (storehorse.sire_id / dam_id) + maternal canonical information
→ report model
→ presentation/PDF
```

Report serving reads only persisted structured/canonical data. No report request parses,
opens, or depends on the historical Word corpus. Reusable maternal information is
persisted once and reused; the private catalogues remain ingestion/reference material.

This ADR complements ADR-005; it does not supersede it.

---

## Rationale

- Deterministic report serving: the same `horse_id` yields the same report from the same
  persisted data.
- Reusable information: extraction cost is paid once per catalogue, not once per report.
- Lower runtime cost and latency.
- Traceability and provenance: every served datum can name its source.
- Independent evolution: extraction and presentation change without breaking each other.
- No private document dependency at serving time.

---

## Consequences

### Positive

- The report pipeline works even if the Word corpus is unavailable at runtime.
- Human corrections live in the canonical data, not in re-parsed output.
- Ingestion can be validated, re-run, and audited independently of the product.

### Negative

- Canonical persistence and provenance must exist before automated reports do.
- Corrections to extraction logic require re-ingestion, not just a redeploy.
- Two paths mean two sets of tests and two failure surfaces to observe.

---

## Alternatives Considered

### Request-time parsing of the historical Word catalogue corpus — Rejected

The default that falls out of "just call the extractor from the endpoint". Couples
serving to private documents, repeats extraction cost per request, produces
non-deterministic reports as parsing evolves, and gives approved human corrections no
durable home.

### Duplicate full ancestry per descendant in a cache table — Rejected as a default

`storehorse.sire_id` / `dam_id` remain the pedigree source, walked recursively. A
denormalised ancestry table may only be introduced by a future measured performance
requirement with its own approved design.

---

## Non-Decisions

This ADR deliberately does **not** decide:

- exact future table names;
- exact caching strategy;
- automatic creation of missing horses (out of scope; future separate design);
- pricing/subscription models;
- PDF visual design;
- any rewrite of the extractor's implementation language.

---

## Review Triggers

Revisit if:

- the business adopts a different authoritative data source for reports;
- a measured performance requirement proves the serving path needs denormalised
  ancestry or a different storage shape;
- report serving ever genuinely requires content that cannot be persisted ahead of time.
