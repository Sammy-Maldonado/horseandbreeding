/**
 * Single owner of the request grammar for `POST /api/search` (HOR-116).
 *
 * The route used to validate by truthiness and parse by coercion:
 *
 *   if (!body.search && !body.page) { ...400... }
 *   const data = await searchHorses(select, search, Number(page));
 *
 * `&&` let a request carrying `search` but no `page` straight through, and
 * `Number(undefined)` is `NaN` — a value Prisma refuses as `skip`, so the
 * caller's mistake came back as a 500. For everything else the coercion was
 * worse than an error, because it answered a number that was valid and wrong:
 * `0` for `null`, `""`, whitespace and `[]`, `1` for `true` and `1.5`, and a
 * silently rounded value for an integer too large to represent. Those queried
 * an offset the caller never asked for and came back looking like an honest
 * answer.
 *
 * The grammar below was read off the only real consumer,
 * `pages/search/[texts]/[page].vue`:
 *
 *   const body = { search: searchText.value, page: (currentPage.value - 1) * 50 };
 *
 * Two things follow from that line and both are load-bearing. `page` is an
 * OFFSET rather than a page number, despite its name — it is handed straight to
 * Prisma `skip`. And the first page sends `0`, which is precisely why
 * truthiness could never have been the test: the most ordinary request in the
 * product is the one a truthiness guard rejects.
 *
 * `search` is genuinely optional. A request with no search term browses every
 * active horse, and `searchHorses` branches on `if (name)` to do it, so an
 * absent, null or empty term all mean the same thing: no name condition.
 *
 * Pure by design: no Prisma, no Nitro, no database. The handler turns a
 * rejection into the caller's 400 with `createError`, keeping validation at the
 * route boundary the way HOR-96 established, and nothing malformed reaches the
 * database because this answers before the first query is built.
 */

/**
 * A canonical offset token: digits only.
 *
 * Deliberately narrower than `Number`. It admits no sign, no decimal point, no
 * exponent, no `0x` prefix and no stray text, so a token can never be partly
 * understood — `"12abc"` is refused rather than read as `12`, and `"1e3"` is
 * refused rather than read as `1000`.
 */
const CANONICAL_OFFSET = /^[0-9]+$/;

/**
 * The one sentence a caller sees when the offset is refused.
 *
 * Written once and never built from the request, so nothing the caller sent can
 * travel back out inside it (HOR-99). Plain English, no internal vocabulary.
 */
export const INVALID_SEARCH_OFFSET_MESSAGE =
  "Page offset must be a whole number, zero or greater.";

/** The same, for a search term that is not text. */
export const INVALID_SEARCH_TERM_MESSAGE =
  "Search must be text. Leave it out to browse every horse.";

/** An accepted request: the term to match and the offset to start from. */
interface ParsedSearchQuery {
  readonly ok: true;
  readonly search: string;
  readonly offset: number;
}

/** A refused request, carrying the reason the caller is allowed to read. */
interface RejectedSearchQuery {
  readonly ok: false;
  readonly reason: string;
}

export type SearchQueryParseResult = ParsedSearchQuery | RejectedSearchQuery;

const refuse = (reason: string): RejectedSearchQuery => ({ ok: false, reason });

/**
 * True for the only values that may be used as a Prisma `skip`.
 *
 * Zero is included: it is the offset the first page sends. The safe range is
 * what keeps the value exact — beyond it JavaScript rounds, and the rows
 * returned would not start where the caller asked. `Number.isSafeInteger`
 * already answers false for `NaN`, `Infinity` and every decimal, so this one
 * test covers every shape the old coercion used to let through.
 */
const isQueryableOffset = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= 0;

/** Reads `page` as the offset to start the result window at. */
const parseOffset = (raw: unknown): number | null => {
  if (typeof raw === "number") {
    return isQueryableOffset(raw) ? raw : null;
  }

  if (typeof raw !== "string" || !CANONICAL_OFFSET.test(raw)) {
    return null;
  }

  // The token is digits only, so `Number` can no longer surprise us here: the
  // sole remaining question is whether the value it denotes is exact.
  const offset = Number(raw);

  return isQueryableOffset(offset) ? offset : null;
};

/**
 * Parses whatever a caller sent as the body of `POST /api/search`.
 *
 * The offset is decided first, because it is the field whose absence used to
 * produce the 500 and the one a caller has to fix before anything else matters.
 *
 * Never throws: every shape a caller can send, including a string, an array or
 * nothing at all, comes back as a refusal.
 */
export function parseSearchQuery(body: unknown): SearchQueryParseResult {
  const request = (body ?? {}) as Record<string, unknown>;

  const offset = parseOffset(request.page);

  if (offset === null) {
    return refuse(INVALID_SEARCH_OFFSET_MESSAGE);
  }

  const term = request.search;

  // Absent, null and empty all mean the same thing to `searchHorses`: no name
  // condition, so the query browses every active horse.
  if (term === undefined || term === null) {
    return { ok: true, search: "", offset };
  }

  if (typeof term !== "string") {
    return refuse(INVALID_SEARCH_TERM_MESSAGE);
  }

  return { ok: true, search: term, offset };
}
