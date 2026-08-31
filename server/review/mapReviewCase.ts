/**
 * Pure mapping from a HOR-14 `ResolutionResult` to review persistence input
 * (HOR-142). Sits between the resolver and the repository:
 *
 *   ResolutionResult -> mapResolutionToReviewCase -> ReviewCaseInput -> persistReviewCases
 *
 * Only AMBIGUOUS and CONFLICT map to a case; EXISTING_HORSE and NEW_HORSE —
 * including an EXISTING_HORSE that carries canonical data conflicts — are
 * explicitly not review material here (automation-mvp FR-004; canonical
 * drift is audited by the write path, not by identity review). The snapshot
 * copies the resolver's evidence verbatim: reason codes pass through without
 * re-validation so additive future codes survive, candidates keep every
 * signal state, and both sides of a Word-versus-Word conflict keep their
 * provenance. Candidates are ordered by ascending horse id — deterministic
 * presentation, never a selection. DB-free and side-effect-free.
 */
import type { ResolutionResult } from "../identity/types";
import { buildReviewCaseKey } from "./keys";
import type { ReviewCandidateSnapshot, ReviewCaseInput, ReviewOutcome } from "./types";

export interface ReviewMappingContext {
  /** Durable `source_assertion.assertion_key` of the resolved assertion. */
  assertionKey: string;
  resolverContractVersion: string;
}

export type MapReviewCaseResult =
  | { kind: "REVIEW_CASE"; input: ReviewCaseInput }
  | { kind: "NOT_REVIEW_MATERIAL"; outcome: "EXISTING_HORSE" | "NEW_HORSE" }
  | { kind: "REJECTED"; reason: "INVALID_ASSERTION_KEY" | "INVALID_CONTRACT_VERSION" };

function snapshotCandidates(result: ResolutionResult): ReviewCandidateSnapshot[] {
  return [...result.candidates]
    .sort((a, b) => a.horseId - b.horseId)
    .map((candidate, candidateOrder) => ({
      horseId: candidate.horseId,
      candidateName: candidate.name,
      candidateOrder,
      classification: candidate.classification,
      signals: structuredClone(candidate.signals),
      corroborations: [...candidate.corroborations],
      contradictions: [...candidate.contradictions],
      rejectionReasons: [...candidate.rejectionReasons],
    }));
}

export function mapResolutionToReviewCase(
  result: ResolutionResult,
  context: ReviewMappingContext,
): MapReviewCaseResult {
  if (result.outcome === "EXISTING_HORSE" || result.outcome === "NEW_HORSE") {
    return { kind: "NOT_REVIEW_MATERIAL", outcome: result.outcome };
  }

  const outcome: ReviewOutcome = result.outcome;
  const key = buildReviewCaseKey({
    assertionKey: context.assertionKey,
    outcome,
    resolverContractVersion: context.resolverContractVersion,
  });
  if (!key.ok) {
    return { kind: "REJECTED", reason: key.reason };
  }

  return {
    kind: "REVIEW_CASE",
    input: {
      reviewCaseKey: key.reviewCaseKey,
      assertionKey: context.assertionKey,
      outcome,
      nameKey: result.nameKey,
      reasonCodes: [...result.reasonCodes],
      candidates: snapshotCandidates(result),
      sourceConflicts: structuredClone(result.sourceConflicts),
      establishment: structuredClone(result.establishment),
      resolverContractVersion: context.resolverContractVersion,
    },
  };
}
