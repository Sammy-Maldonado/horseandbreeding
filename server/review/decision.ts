/**
 * Validation of a human review decision (HOR-142).
 *
 * Pure shape rules only: who decided and when are mandatory, and exactly the
 * assigning decision carries a `storehorse.horse_id` reference. What the
 * decision *does* is owned elsewhere — assignment and NEW_HORSE creation
 * execute in the ingestion write path (HOR-13) under the ADR-018 contract;
 * this module never touches a horse and the repository never deletes the
 * original evidence a decision was made on.
 */
import type { Rejected } from "../ingestion/types";
import type { ReviewDecision } from "./types";

export interface ReviewDecisionInput {
  decision: ReviewDecision;
  /** Reference to the chosen canonical horse — assigning decision only. */
  decidedHorseId: number | null;
  decidedBy: string;
  decidedAt: Date;
  decisionNote: string | null;
}

export type ReviewDecisionValidation =
  | { ok: true }
  | Rejected<
      | "ASSIGNED_DECISION_REQUIRES_HORSE"
      | "ONLY_ASSIGNED_DECISION_CARRIES_HORSE"
      | "INVALID_HORSE_ID"
      | "MISSING_DECIDER"
      | "INVALID_DECISION_TIME"
    >;

export function validateReviewDecision(input: ReviewDecisionInput): ReviewDecisionValidation {
  if (input.decidedBy.trim() === "") {
    return { ok: false, reason: "MISSING_DECIDER" };
  }
  if (Number.isNaN(input.decidedAt.getTime())) {
    return { ok: false, reason: "INVALID_DECISION_TIME" };
  }
  if (input.decision === "ASSIGNED_EXISTING_HORSE") {
    if (input.decidedHorseId === null) {
      return { ok: false, reason: "ASSIGNED_DECISION_REQUIRES_HORSE" };
    }
    if (!Number.isInteger(input.decidedHorseId) || input.decidedHorseId <= 0) {
      return { ok: false, reason: "INVALID_HORSE_ID" };
    }
    return { ok: true };
  }
  if (input.decidedHorseId !== null) {
    return { ok: false, reason: "ONLY_ASSIGNED_DECISION_CARRIES_HORSE" };
  }
  return { ok: true };
}
