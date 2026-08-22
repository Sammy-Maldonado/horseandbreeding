/**
 * Single owner of the request grammar for a horse id (HOR-103).
 *
 * Three route handlers used to carry their own copy of:
 *
 *   idString.split(",").map((id) => Number(id))
 *
 * `Number` is a coercion, not a parser, and it fails in two different ways.
 * It answers `NaN` for `"abc"` and `Infinity` for `"Infinity"` — values Prisma
 * cannot serialise, so the request died as a 500. Worse, it answers a number
 * that is valid and wrong for everything else: `0` for whitespace, `16` for
 * `"0x10"`, `1000` for `"1e3"`, `1.5` for `"1.5"`, and a silently rounded value
 * for an integer too large to represent. Those queried an id the caller never
 * asked for and came back looking like an honest empty answer. An empty token
 * became an id of its own, so `",1003"` returned two results for one requested
 * id and the batch stopped lining up with the request.
 *
 * This module decides the grammar once, as a pure function: no Prisma, no
 * Nitro, no database. The handler turns a rejection into the caller's 400 with
 * `createError`, keeping the validation at the route boundary the way HOR-96
 * established. Nothing malformed reaches the database, because the parser
 * answers before the first query is built.
 */

/** The character separating ids in a batch request. */
export const HORSE_ID_SEPARATOR = ",";

/**
 * A canonical id token: digits only.
 *
 * Deliberately narrower than `Number`. It admits no sign, no decimal point, no
 * exponent, no `0x` prefix and no stray text, so a token can never be partly
 * understood — `"12abc"` is refused rather than read as `12`.
 */
const CANONICAL_ID = /^[0-9]+$/;

/**
 * The one sentence a caller sees when an id is refused.
 *
 * Written once and never built from the request, so nothing the caller sent can
 * travel back out inside it (HOR-99). Plain English, no internal vocabulary.
 */
export const INVALID_HORSE_ID_MESSAGE =
  "Horse id must be a whole number greater than zero. " +
  "Separate more than one id with commas.";

/** An accepted request: ids ready to query with, in the order given. */
interface ParsedHorseIds {
  readonly ok: true;
  readonly ids: number[];
}

/** A refused request, carrying the reason the caller is allowed to read. */
interface RejectedHorseIds {
  readonly ok: false;
  readonly reason: string;
}

export type HorseIdParseResult = ParsedHorseIds | RejectedHorseIds;

const rejected: RejectedHorseIds = {
  ok: false,
  reason: INVALID_HORSE_ID_MESSAGE
};

/**
 * True for the only values that may be used as a `storehorse.horse_id`.
 *
 * `gt: 0` is already how the pedigree walk itself distinguishes a real dam from
 * an absent one, so zero and negatives are not ids in this domain. The safe
 * range is what keeps the value exact: beyond it JavaScript rounds, and the id
 * queried would not be the id requested.
 */
const isQueryableId = (value: number): boolean =>
  Number.isSafeInteger(value) && value > 0;

/**
 * Parses whatever a caller sent as `id` into the ids to query with.
 *
 * Accepts a single JSON number, or a string holding one id or a comma-separated
 * list of them. Surrounding whitespace is allowed around each id — a person
 * typing a list types spaces after the commas — but a token that is empty or
 * only whitespace is a refusal, not an id, because letting it become `0` is
 * what used to change how many results came back.
 *
 * Never throws: every shape a caller can send, including an array or an object,
 * comes back as a refusal.
 */
export function parseHorseIds(raw: unknown): HorseIdParseResult {
  if (typeof raw === "number") {
    return isQueryableId(raw) ? { ok: true, ids: [raw] } : rejected;
  }

  if (typeof raw !== "string") {
    return rejected;
  }

  const tokens = raw.split(HORSE_ID_SEPARATOR);
  const ids: number[] = [];

  for (const token of tokens) {
    const trimmed = token.trim();

    if (!CANONICAL_ID.test(trimmed)) {
      return rejected;
    }

    // The token is digits only, so `Number` can no longer surprise us here:
    // the sole remaining question is whether the value it denotes is exact.
    const id = Number(trimmed);

    if (!isQueryableId(id)) {
      return rejected;
    }

    ids.push(id);
  }

  return { ok: true, ids };
}
