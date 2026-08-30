/**
 * Horse-name normalisation approved for HOR-14 (writeup-grammar.md §7).
 *
 * Only two transformations are evidence-approved on the measured registry:
 * trimming and collapsing internal whitespace. The comparison key adds an
 * explicit, application-level case-insensitive step. Nothing else — no
 * punctuation stripping, no studbook-suffix stripping (measured net-negative:
 * 13 rescues against 295 new collision groups), no diacritics folding, no
 * token deletion, no abbreviation expansion, no fuzzy matching.
 *
 * The database collation happens to be case- and accent-insensitive; that is
 * a storage property, not the identity contract. Equality is decided here.
 *
 * Known limitation (v1): the typographic apostrophe U+2019 and the ASCII
 * apostrophe U+0027 are distinct. Word emits U+2019; the registry mostly
 * holds ASCII. A read-only collision probe must approve the equivalence
 * before it is added — the local database was unavailable when HOR-14 was
 * implemented, so the key leaves both characters as printed.
 */

const WHITESPACE_RUN = /\s+/g;

/** Display form: trimmed, single-spaced, otherwise exactly as printed. */
export function normaliseHorseName(raw: string | null | undefined): string {
  if (raw == null) {
    return "";
  }
  return raw.replace(WHITESPACE_RUN, " ").trim();
}

/** Comparison form; `null` when the name carries no usable text. */
export function horseNameKey(raw: string | null | undefined): string | null {
  const normalised = normaliseHorseName(raw);
  return normalised === "" ? null : normalised.toLowerCase();
}
