/**
 * Identity signal comparisons (HOR-14, writeup-grammar.md §7).
 *
 * Each comparison yields MATCH, MISMATCH or UNKNOWN. UNKNOWN means "no usable
 * evidence on at least one side" and is never a match: two unknown birth
 * years are not equal, an ambiguous source relation is not a parent, and a
 * registry sentinel is not a value.
 */
import { horseNameKey, normaliseHorseName } from "./nameKey";
import type {
  HorseSex,
  IdentitySignal,
  SignalEvidence,
  SourceParentAssertion,
  StorehorseRow,
} from "./types";

/**
 * Interim usability screen for birth years. HOR-144 owns the plausibility
 * range; until it lands, only integers in this window are evidence. The
 * bounds are the descriptive markers the read-only baseline used to count
 * junk (81 registry rows below 1900, 6 above 2030, 20,607 zeros) — a
 * conservative filter, not an approved domain range.
 */
export const USABLE_BIRTH_YEAR_MIN = 1900;
export const USABLE_BIRTH_YEAR_MAX = 2030;

export function usableBirthYear(value: number | null | undefined): number | null {
  if (value == null || !Number.isInteger(value)) {
    return null;
  }
  if (value < USABLE_BIRTH_YEAR_MIN || value > USABLE_BIRTH_YEAR_MAX) {
    return null;
  }
  return value;
}

export function compareBirthYear(
  source: number | null | undefined,
  candidate: number | null | undefined,
): SignalEvidence {
  const sourceYear = usableBirthYear(source);
  const candidateYear = usableBirthYear(candidate);
  const evidence: SignalEvidence = {
    signal: "BIRTH_YEAR",
    state: "UNKNOWN",
    sourceValue: sourceYear === null ? null : String(sourceYear),
    candidateValue: candidateYear === null ? null : String(candidateYear),
  };
  if (sourceYear !== null && candidateYear !== null) {
    evidence.state = sourceYear === candidateYear ? "MATCH" : "MISMATCH";
  }
  return evidence;
}

export function compareSex(source: HorseSex, candidate: HorseSex): SignalEvidence {
  const evidence: SignalEvidence = {
    signal: "SEX",
    state: "UNKNOWN",
    sourceValue: source === "UNKNOWN" ? null : source,
    candidateValue: candidate === "UNKNOWN" ? null : candidate,
  };
  if (source !== "UNKNOWN" && candidate !== "UNKNOWN") {
    evidence.state = source === candidate ? "MATCH" : "MISMATCH";
  }
  return evidence;
}

export type ParentSignal = Extract<IdentitySignal, "DAM" | "MATERNAL_GRANDDAM" | "SIRE">;

/**
 * Compares a source parent assertion with the registered parent row (already
 * resolved through dam_id / sire_id by the caller). Only a `CONFIDENT`
 * relation is evidence; the other reliabilities are reported as UNKNOWN with
 * the reason attached.
 */
export function compareParentName(
  signal: ParentSignal,
  source: SourceParentAssertion | null,
  registeredParent: StorehorseRow | undefined,
): SignalEvidence {
  const sourceKey = source ? horseNameKey(source.name) : null;
  const candidateKey = registeredParent ? horseNameKey(registeredParent.name) : null;
  const evidence: SignalEvidence = {
    signal,
    state: "UNKNOWN",
    sourceValue: sourceKey === null ? null : normaliseHorseName(source!.name),
    candidateValue: candidateKey === null ? null : normaliseHorseName(registeredParent!.name),
  };
  if (source && sourceKey !== null && source.confidence !== "CONFIDENT") {
    evidence.note = "SOURCE_RELATION_AMBIGUOUS";
    return evidence;
  }
  if (sourceKey !== null && candidateKey !== null) {
    evidence.state = sourceKey === candidateKey ? "MATCH" : "MISMATCH";
  }
  return evidence;
}
