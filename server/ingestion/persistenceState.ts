/**
 * Zero-loss persistence states (HOR-9, ADR-018 §11).
 *
 * The extractor accounts for every meaningful source node in one of five
 * statuses. Persistence widens that into seven states, because a PARSED item
 * still has to survive identity resolution: it becomes canonical only once it
 * is attached to a `storehorse.horse_id`, and until then — or when resolution
 * is ambiguous or contradictory — it is kept as a source fact, never dropped
 * and never attached to a horse by guesswork.
 *
 * This module holds the rules only. Identity resolution itself (HOR-14) and
 * the review workflow (HOR-142) are not implemented here.
 * No Prisma, no Nitro, no database.
 */
import {
  INGESTION_PERSISTENCE_STATES,
  type ExtractorAccountingStatus,
  type IdentityResolutionOutcome,
  type IngestionPersistenceState,
  type Rejected,
  type SourceAssertionKind,
} from "./types";

/** Kinds that, once resolved, are links between canonical records rather than values. */
export const RELATIONSHIP_ASSERTION_KINDS = [
  "PEDIGREE_DAM",
  "PEDIGREE_SIRE",
  "DESCENDANT_LINK",
  "APPROVAL",
  "STUDBOOK",
  "DISCIPLINE",
  "SEE_ABOVE_REFERENCE",
] as const satisfies readonly SourceAssertionKind[];

export interface PersistenceStateInput {
  accountingStatus: ExtractorAccountingStatus;
  assertionKind: SourceAssertionKind;
  resolutionOutcome: IdentityResolutionOutcome;
}

export function derivePersistenceState(input: PersistenceStateInput): IngestionPersistenceState {
  if (input.assertionKind === "EXTRACTION_ERROR") return "ERROR";
  if (input.assertionKind === "UNSUPPORTED_STRUCTURE") return "EXPLICITLY_UNSUPPORTED";

  switch (input.accountingStatus) {
    case "ERROR":
      return "ERROR";
    case "EXPLICITLY_UNSUPPORTED":
      return "EXPLICITLY_UNSUPPORTED";
    case "EXPLICITLY_AMBIGUOUS":
      return "AMBIGUOUS";
    case "PRESERVED_UNPARSED":
      return "PRESERVED_SOURCE_FACT";
    case "PARSED":
      break;
  }

  switch (input.resolutionOutcome) {
    case "AMBIGUOUS":
      return "AMBIGUOUS";
    case "CONFLICT":
      return "CONFLICT";
    case "NOT_ATTEMPTED":
      return "PRESERVED_SOURCE_FACT";
    case "EXISTING_HORSE":
    case "NEW_HORSE":
      return (RELATIONSHIP_ASSERTION_KINDS as readonly string[]).includes(input.assertionKind)
        ? "CANONICALISED_RELATIONSHIP"
        : "CANONICALISED_STRUCTURED";
  }
}

export interface AccountingInput {
  /** Number of extracted items the source produced (results, entries, segments...). */
  totalSourceItems: number;
  /** The persistence state each item ended in. */
  states: readonly IngestionPersistenceState[];
}

export interface AccountingSummary {
  totalSourceItems: number;
  accounted: number;
  /** Items missing (positive) or counted twice (negative). Zero is the only acceptable value. */
  unaccounted: number;
  complete: boolean;
  counts: Record<IngestionPersistenceState, number>;
}

export function summariseAccounting(input: AccountingInput): AccountingSummary {
  const counts = Object.fromEntries(
    INGESTION_PERSISTENCE_STATES.map((state) => [state, 0]),
  ) as Record<IngestionPersistenceState, number>;
  for (const state of input.states) counts[state] += 1;

  const accounted = input.states.length;
  const unaccounted = input.totalSourceItems - accounted;

  return {
    totalSourceItems: input.totalSourceItems,
    accounted,
    unaccounted,
    complete: unaccounted === 0,
    counts,
  };
}

export interface AssertionLinksInput {
  persistenceState: IngestionPersistenceState;
  resolutionOutcome: IdentityResolutionOutcome;
  /** The canonical horse the assertion is attached to, or null. */
  horseId: number | null;
}

export type AssertionLinksResult =
  | { ok: true }
  | Rejected<
      | "INVALID_HORSE_ID"
      | "AMBIGUOUS_MUST_NOT_ASSIGN_HORSE"
      | "UNRESOLVED_MUST_NOT_ASSIGN_HORSE"
      | "RESOLVED_REQUIRES_HORSE"
      | "CANONICALISED_REQUIRES_HORSE"
    >;

/**
 * The invariant behind "identity resolution never creates a horse blindly":
 * a horse id is attached only by a resolution that chose it, and a
 * canonicalised state never exists without one.
 */
export function validateAssertionLinks(input: AssertionLinksInput): AssertionLinksResult {
  const { horseId, resolutionOutcome, persistenceState } = input;

  if (horseId !== null && (!Number.isInteger(horseId) || horseId <= 0)) {
    return { ok: false, reason: "INVALID_HORSE_ID" };
  }
  if (resolutionOutcome === "AMBIGUOUS" && horseId !== null) {
    return { ok: false, reason: "AMBIGUOUS_MUST_NOT_ASSIGN_HORSE" };
  }
  if (resolutionOutcome === "NOT_ATTEMPTED" && horseId !== null) {
    return { ok: false, reason: "UNRESOLVED_MUST_NOT_ASSIGN_HORSE" };
  }
  if ((resolutionOutcome === "EXISTING_HORSE" || resolutionOutcome === "NEW_HORSE") && horseId === null) {
    return { ok: false, reason: "RESOLVED_REQUIRES_HORSE" };
  }
  if (
    (persistenceState === "CANONICALISED_STRUCTURED" ||
      persistenceState === "CANONICALISED_RELATIONSHIP") &&
    horseId === null
  ) {
    return { ok: false, reason: "CANONICALISED_REQUIRES_HORSE" };
  }
  return { ok: true };
}
