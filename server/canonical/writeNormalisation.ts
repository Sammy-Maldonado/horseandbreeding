/**
 * Canonical write-normalisation boundary (HOR-154).
 *
 * The one server-side contract every canonical write path shares — Word
 * ingestion (HOR-13), future administrator forms, future Excel imports
 * (HOR-18) and any API write. Three representations stay deliberately
 * distinct, and none replaces another:
 *
 *   source / raw value        exactly what the source or administrator
 *                             supplied; preserved through the provenance
 *                             ledger (ADR-018, zero-loss)
 *   canonical display value   the stored authoritative presentation value;
 *                             only trimmed and single-spaced — casing,
 *                             punctuation, accents, hyphens and studbook
 *                             suffixes are content and are never rewritten
 *   comparison key            derived, in-memory only; used for candidate
 *                             generation and duplicate detection
 *                             (HOR-14 / HOR-152), never stored as the value
 *
 * This module re-exports the approved primitives so every writer uses one
 * implementation; it defines no second normaliser. Everything exported is
 * deterministic, idempotent, pure and database-free. Client-side formatting
 * is a convenience only — this boundary decides what is persisted.
 *
 * Full contract and field-class matrix: docs/data/canonical-write-normalisation.md
 */

export { horseNameKey, normaliseHorseName } from "../identity/nameKey";
export { normaliseWriteupContent, writeupContentHash } from "../ingestion/writeup";

import { normaliseHorseName } from "../identity/nameKey";

/**
 * Display normalisation of a short nullable canonical text field (rider,
 * event name, catalogue name…): the same approved display policy as the
 * horse name — trim, collapse internal whitespace runs, change nothing
 * else — for columns where an absent value is NULL rather than "".
 * Delegates so the display policy has exactly one implementation.
 */
export function normaliseCanonicalTextField(raw: string | null | undefined): string | null {
  const value = normaliseHorseName(raw);
  return value === "" ? null : value;
}
