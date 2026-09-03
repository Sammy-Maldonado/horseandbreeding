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
 * The comparison key also folds the typographic apostrophe U+2019 to the
 * ASCII apostrophe U+0027 (HOR-152). Word emits U+2019; the registry mostly
 * holds ASCII, so without the fold an existing row is never generated as a
 * candidate and an established source horse becomes a false NEW_HORSE. The
 * read-only probe measured the fold safe: 18 of 56,395 named active rows
 * carry U+2019, folding merges 9 key pairs (0.03% of rows), and every merged
 * pair resolves through the ordinary candidate rules — family evidence
 * decides or the outcome is AMBIGUOUS; a fold never assigns identity by
 * itself. Other single-quote lookalikes (U+2018, U+02BC, U+0060, U+00B4)
 * measured at most one row each and stay as printed. Unicode normalisation
 * is not applied: NFC was measured a no-op on every stored name.
 */

const WHITESPACE_RUN = /\s+/g;
const TYPOGRAPHIC_APOSTROPHE = /’/g;

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
  if (normalised === "") {
    return null;
  }
  return normalised.toLowerCase().replace(TYPOGRAPHIC_APOSTROPHE, "'");
}
