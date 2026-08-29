/**
 * Persistence vocabulary of the canonical relational model (HOR-9, ADR-018).
 *
 * These literal unions mirror, value for value and in order, the enums that
 * `prisma/schema.prisma` enforces in the database, plus the accounting
 * statuses the Python extractor emits (`extractor/maternal_line/model.py`).
 * `types.test.ts` parses both files and fails the moment either side drifts,
 * so application code can depend on plain strings without importing the
 * generated Prisma client — the ingestion rules stay pure and testable in the
 * Node project. No Prisma, no Nitro, no database here.
 */

/** Zero-loss outcome of one extracted item after canonicalisation (ADR-018 §11). */
export const INGESTION_PERSISTENCE_STATES = [
  "CANONICALISED_STRUCTURED",
  "CANONICALISED_RELATIONSHIP",
  "PRESERVED_SOURCE_FACT",
  "AMBIGUOUS",
  "CONFLICT",
  "EXPLICITLY_UNSUPPORTED",
  "ERROR",
] as const;
export type IngestionPersistenceState = (typeof INGESTION_PERSISTENCE_STATES)[number];

/** Identity resolution outcome for the horse an assertion is about (ADR-018 §5). */
export const IDENTITY_RESOLUTION_OUTCOMES = [
  "NOT_ATTEMPTED",
  "EXISTING_HORSE",
  "NEW_HORSE",
  "AMBIGUOUS",
  "CONFLICT",
] as const;
export type IdentityResolutionOutcome = (typeof IDENTITY_RESOLUTION_OUTCOMES)[number];

/** What one source assertion claims (closed vocabulary of the write-up grammar). */
export const SOURCE_ASSERTION_KINDS = [
  "SUBJECT_IDENTITY",
  "BIRTH_YEAR",
  "PEDIGREE_DAM",
  "PEDIGREE_SIRE",
  "DESCENDANT_LINK",
  "MATERNAL_WRITEUP",
  "COMPETITION_RESULT",
  "APPROVAL",
  "STUDBOOK",
  "DISCIPLINE",
  "SPORT_LEVEL",
  "RIDER",
  "COUNTRY",
  "SIRE_NOTE",
  "HEAD_NOTE",
  "SEE_ABOVE_REFERENCE",
  "FREE_TEXT",
  "UNSUPPORTED_STRUCTURE",
  "EXTRACTION_ERROR",
] as const;
export type SourceAssertionKind = (typeof SOURCE_ASSERTION_KINDS)[number];

export const WRITEUP_LIFECYCLE_STATES = ["IMPORTED", "APPROVED", "CORRECTED"] as const;
export type WriteupLifecycleState = (typeof WRITEUP_LIFECYCLE_STATES)[number];

/** Mirrors the extractor placing vocabulary: placed / won / competed. */
export const COMPETITION_RESULT_KINDS = ["PLACED", "WON", "COMPETED"] as const;
export type CompetitionResultKind = (typeof COMPETITION_RESULT_KINDS)[number];

export const COMPETITION_PARTICIPATIONS = ["INDIVIDUAL", "TEAM"] as const;
export type CompetitionParticipation = (typeof COMPETITION_PARTICIPATIONS)[number];

/**
 * Accounting statuses of the extractor (`ACCOUNTING_STATUSES` in model.py).
 * Every meaningful source node ends in exactly one of these.
 */
export const EXTRACTOR_ACCOUNTING_STATUSES = [
  "PARSED",
  "PRESERVED_UNPARSED",
  "EXPLICITLY_UNSUPPORTED",
  "EXPLICITLY_AMBIGUOUS",
  "ERROR",
] as const;
export type ExtractorAccountingStatus = (typeof EXTRACTOR_ACCOUNTING_STATUSES)[number];

/** A pure rule answers with a value or with a named reason — it never throws. */
export type Rejected<Reason extends string> = { ok: false; reason: Reason };
