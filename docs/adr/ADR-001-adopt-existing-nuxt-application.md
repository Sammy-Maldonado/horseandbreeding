# ADR-001: Adopt and Modernise the Existing Nuxt Application

**Status:** Accepted
**Date:** 2026-07-20
**Deciders:** Sammy Maldonado

---

## Context

A previous developer built a substantial Nuxt application containing authentication,
search, pedigree, maternal-line, reporting, and related components. The inventory of
what already exists is recorded in
[existing-assets.md](../architecture/existing-assets.md).

The project stalled because the historical Word data was never transformed into
structured reusable data. The missing capability was never the frontend.

A rewrite would spend time rebuilding existing capabilities while leaving the core data
problem unsolved — repeating the failure mode that stalled the project the first time.

---

## Decision

Adopt the existing Nuxt 3 application as the product base. **The application will not be
rewritten from scratch.**

The team will:

- audit existing endpoints and components before reuse;
- refactor incrementally;
- preserve verified working pedigree behaviour;
- replace only parts proven unsafe, broken, or unmaintainable;
- focus new development on extraction, canonical data, report assembly, review, and
  delivery.

`_legacy/` remains read-only reference material and is never imported at runtime.

---

## Rationale

- Existing work contains reusable value.
- The missing business capability is data extraction and reuse, not a new frontend.
- Incremental modernisation reduces delivery risk.
- Verified pedigree relations should not be recreated without need.
- A rewrite would delay the end-to-end business proof.

---

## Consequences

### Positive

- Faster path to usable automation.
- Lower migration and regression risk.
- Existing domain behaviour can be verified and retained.
- Work remains aligned with the business bottleneck.

### Negative

- Legacy inconsistencies must be discovered and handled.
- Some code may require adapters or compatibility layers.
- Architecture quality will improve incrementally rather than immediately.
- Inherited code must be audited before it can be trusted, which is itself work.

---

## Alternatives Considered

### Rewrite from scratch — Rejected

Would create a cleaner baseline but repeats the previous failure mode: code first,
historical data later.

### Keep only the old PHP system — Rejected

The PHP system is a useful read-only reference but is not the target platform.

---

## Review Triggers

Revisit only if:

- the adopted application is proven structurally incapable of the required workflows;
- maintenance cost exceeds a documented replacement plan;
- a replacement has a tested migration path and business approval.
