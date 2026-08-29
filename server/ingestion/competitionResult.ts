/**
 * Extracted competition result → `competition_history` row (HOR-9, ADR-018 §8).
 *
 * `competition_history` is the existing relational home of sport results and
 * keeps `storehorse_id` = the horse that achieved the result. HOR-9 evolved it
 * additively; this module maps one extractor `Result` (output contract 1) and
 * its `Subject` context onto the legacy and the structured columns together.
 *
 * Two rules matter more than the field list:
 *   - nothing is truncated: a value wider than its legacy column is rejected
 *     with a reason, so the caller keeps it as a preserved source fact;
 *   - nothing is guessed: `discipline_code`, `event_name` and `participation`
 *     stay NULL because output contract 1 does not carry them.
 *
 * No Prisma, no Nitro, no database.
 */
import type {
  CompetitionParticipation,
  CompetitionResultKind,
  IngestionPersistenceState,
  Rejected,
} from "./types";

/** Legacy column widths of `competition_history` (prisma/schema.prisma). */
const PLACED_IN_COMPETITION_MAX = 50;
const DETAIL_MAX = 255;
const COUNTRY_CODE_MAX = 3;
const HORSE_NAME_MAX = 255;
const RIDER_MAX = 255;
const LEVEL_CODE_MAX = 20;

const PLACING_KIND_TO_RESULT_KIND: Record<string, CompetitionResultKind> = {
  placed: "PLACED",
  won: "WON",
  competed: "COMPETED",
};

export type ResultKindMapping =
  | { ok: true; resultKind: CompetitionResultKind | null }
  | Rejected<"UNKNOWN_PLACING_KIND">;

export function mapResultKind(placingKind: string | null): ResultKindMapping {
  if (placingKind === null) return { ok: true, resultKind: null };
  const resultKind = PLACING_KIND_TO_RESULT_KIND[placingKind];
  return resultKind === undefined
    ? { ok: false, reason: "UNKNOWN_PLACING_KIND" }
    : { ok: true, resultKind };
}

/** The extractor `Result` dataclass (output contract 1). */
export interface ExtractedResult {
  year: number;
  placing: string | null;
  placing_kind: string | null;
  detail: string | null;
  raw: string;
  offset: number;
  status: string;
}

/** The parts of the extractor `Subject` a result row needs. */
export interface ExtractedSubject {
  name: string;
  name_raw: string;
  rider: string | null;
  country: string | null;
  level: { code: string; raw: string; height_m: number | null } | null;
}

export interface CompetitionHistoryInput {
  result: ExtractedResult;
  subject: ExtractedSubject;
  /** The canonical horse that achieved the result, or null while unresolved. */
  horseId: number | null;
  ingestionRunId: number;
  persistenceState: IngestionPersistenceState;
}

/** Column-shaped insert data for `competition_history`. */
export interface CompetitionHistoryRecord {
  horse_name: string;
  storehorse_id: number | null;
  rider: string | null;
  competition_year: number;
  location: string | null;
  csi: string | null;
  type: string | null;
  height: number | null;
  placed_in_competition: string | null;
  detail: string | null;
  discipline_code: string | null;
  result_kind: CompetitionResultKind | null;
  event_name: string | null;
  level_code: string | null;
  participation: CompetitionParticipation | null;
  country_code: string | null;
  raw_source_segment: string;
  ingestion_run_id: number;
  canonicalisation_state: IngestionPersistenceState;
}

export type CompetitionHistoryMapping =
  | { ok: true; record: CompetitionHistoryRecord }
  | Rejected<
      | "RESULT_NOT_PARSED"
      | "UNKNOWN_PLACING_KIND"
      | "INVALID_YEAR"
      | "INVALID_HORSE_ID"
      | "PLACING_TOO_LONG"
      | "DETAIL_TOO_LONG"
      | "COUNTRY_TOO_LONG"
      | "HORSE_NAME_TOO_LONG"
      | "RIDER_TOO_LONG"
      | "LEVEL_CODE_TOO_LONG"
    >;

const tooLong = (value: string | null, max: number): boolean =>
  value !== null && value.length > max;

export function toCompetitionHistoryRecord(
  input: CompetitionHistoryInput,
): CompetitionHistoryMapping {
  const { result, subject, horseId } = input;

  if (result.status !== "PARSED") return { ok: false, reason: "RESULT_NOT_PARSED" };

  const kind = mapResultKind(result.placing_kind);
  if (!kind.ok) return kind;

  if (!Number.isInteger(result.year) || result.year < 1000 || result.year > 9999) {
    return { ok: false, reason: "INVALID_YEAR" };
  }
  if (horseId !== null && (!Number.isInteger(horseId) || horseId <= 0)) {
    return { ok: false, reason: "INVALID_HORSE_ID" };
  }
  if (tooLong(result.placing, PLACED_IN_COMPETITION_MAX)) {
    return { ok: false, reason: "PLACING_TOO_LONG" };
  }
  if (tooLong(result.detail, DETAIL_MAX)) return { ok: false, reason: "DETAIL_TOO_LONG" };
  if (tooLong(subject.country, COUNTRY_CODE_MAX)) return { ok: false, reason: "COUNTRY_TOO_LONG" };
  if (tooLong(subject.name_raw, HORSE_NAME_MAX)) return { ok: false, reason: "HORSE_NAME_TOO_LONG" };
  if (tooLong(subject.rider, RIDER_MAX)) return { ok: false, reason: "RIDER_TOO_LONG" };
  if (tooLong(subject.level?.code ?? null, LEVEL_CODE_MAX)) {
    return { ok: false, reason: "LEVEL_CODE_TOO_LONG" };
  }

  return {
    ok: true,
    record: {
      horse_name: subject.name_raw,
      storehorse_id: horseId,
      rider: subject.rider,
      competition_year: result.year,
      location: null,
      csi: null,
      type: null,
      height: subject.level?.height_m ?? null,
      placed_in_competition: result.placing,
      detail: result.detail,
      discipline_code: null,
      result_kind: kind.resultKind,
      event_name: null,
      level_code: subject.level?.code ?? null,
      participation: null,
      country_code: subject.country,
      raw_source_segment: result.raw,
      ingestion_run_id: input.ingestionRunId,
      canonicalisation_state: input.persistenceState,
    },
  };
}
