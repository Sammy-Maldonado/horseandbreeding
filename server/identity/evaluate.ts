/**
 * Per-candidate evidence evaluation (HOR-14, writeup-grammar.md §7).
 *
 * A candidate is a registry row that shares the source entity's name key.
 * The five identity signals are compared in the contract order and the
 * MATCH / MISMATCH counts classify the candidate. A sex match is reported but
 * never counts as corroboration: it separates far too little to identify a
 * horse on its own. A sex mismatch, when both sides are known, is a
 * contradiction like any other.
 */
import { normaliseHorseName } from "./nameKey";
import { compareBirthYear, compareParentName, compareSex } from "./signals";
import type { StorehorseIndex } from "./storehorseIndex";
import type {
  CandidateClassification,
  CandidateEvaluation,
  IdentitySignal,
  ReasonCode,
  SignalEvidence,
  SourceHorseEntity,
  StorehorseRow,
} from "./types";

const CORROBORATING_SIGNALS: ReadonlySet<IdentitySignal> = new Set<IdentitySignal>([
  "DAM",
  "MATERNAL_GRANDDAM",
  "SIRE",
  "BIRTH_YEAR",
]);

const PARENT_SIGNALS: ReadonlySet<IdentitySignal> = new Set<IdentitySignal>([
  "DAM",
  "MATERNAL_GRANDDAM",
  "SIRE",
]);

export function classifyCandidate(
  corroborations: readonly IdentitySignal[],
  contradictions: readonly IdentitySignal[],
): CandidateClassification {
  const corroborated = corroborations.length;
  const contradicted = contradictions.length;
  if (corroborated === 0) {
    if (contradicted === 0) return "NEUTRAL";
    return contradicted === 1 ? "CONTRADICTED" : "EXCLUDED";
  }
  if (contradicted === 0) return "SUPPORTED";
  return corroborated >= 2 && corroborated > contradicted ? "CONFLICTED_SUPPORTED" : "MIXED";
}

export function evaluateCandidate(
  entity: SourceHorseEntity,
  candidate: StorehorseRow,
  index: StorehorseIndex,
): CandidateEvaluation {
  const dam = index.damOf(candidate);
  const signals: SignalEvidence[] = [
    compareParentName("DAM", entity.dam, dam),
    compareParentName("MATERNAL_GRANDDAM", entity.maternalGranddam, dam ? index.damOf(dam) : undefined),
    compareParentName("SIRE", entity.sire, index.sireOf(candidate)),
    compareBirthYear(entity.birthYear, candidate.birthYear),
    compareSex(entity.sex, candidate.sex),
  ];

  const corroborations = signals
    .filter((s) => s.state === "MATCH" && CORROBORATING_SIGNALS.has(s.signal))
    .map((s) => s.signal);
  const contradictions = signals.filter((s) => s.state === "MISMATCH").map((s) => s.signal);

  const rejectionReasons: ReasonCode[] = [];
  if (contradictions.some((s) => PARENT_SIGNALS.has(s))) {
    rejectionReasons.push("TRUSTED_PARENT_MISMATCH");
  }
  if (contradictions.some((s) => !PARENT_SIGNALS.has(s))) {
    rejectionReasons.push("TRUSTED_SIGNAL_MISMATCH");
  }

  return {
    horseId: candidate.horseId,
    name: normaliseHorseName(candidate.name),
    classification: classifyCandidate(corroborations, contradictions),
    signals,
    corroborations,
    contradictions,
    rejectionReasons,
  };
}
