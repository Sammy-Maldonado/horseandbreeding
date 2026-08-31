import { describe, expect, it } from "vitest";

import { validateReviewDecision } from "./decision";
import { REVIEW_DECISIONS } from "./types";

/**
 * Pure validation of a human review decision (HOR-142). The Linear
 * acceptance criteria name the decisions: assign an existing horse_id,
 * approve a NEW_HORSE creation (executed later under the ADR-018 contract,
 * never here), keep the entity text-only, or reject the assertion — always
 * with who and when. Recording a decision never deletes original evidence;
 * that is enforced at the repository layer, this module only answers
 * whether a decision is well-formed.
 */

const DECIDED_AT = new Date("2026-08-31T12:00:00Z");

function assigned(overrides: Record<string, unknown> = {}) {
  return {
    decision: "ASSIGNED_EXISTING_HORSE" as const,
    decidedHorseId: 421,
    decidedBy: "reviewer-fixture",
    decidedAt: DECIDED_AT,
    decisionNote: null,
    ...overrides,
  };
}

describe("validateReviewDecision", () => {
  it("accepts every supported decision when well-formed (CASE 15, CASE 16, CASE 17)", () => {
    expect(REVIEW_DECISIONS).toEqual([
      "ASSIGNED_EXISTING_HORSE",
      "APPROVED_NEW_HORSE",
      "KEPT_TEXT_ONLY",
      "REJECTED",
    ]);

    expect(validateReviewDecision(assigned())).toEqual({ ok: true });
    for (const decision of ["APPROVED_NEW_HORSE", "KEPT_TEXT_ONLY", "REJECTED"] as const) {
      expect(validateReviewDecision(assigned({ decision, decidedHorseId: null }))).toEqual({ ok: true });
    }
  });

  it("requires a storehorse reference when assigning an existing horse (CASE 16)", () => {
    expect(validateReviewDecision(assigned({ decidedHorseId: null }))).toEqual({
      ok: false,
      reason: "ASSIGNED_DECISION_REQUIRES_HORSE",
    });
  });

  it("rejects an unusable horse reference", () => {
    for (const decidedHorseId of [0, -3, 1.5, Number.NaN]) {
      expect(validateReviewDecision(assigned({ decidedHorseId }))).toEqual({
        ok: false,
        reason: "INVALID_HORSE_ID",
      });
    }
  });

  it("allows a horse reference only on the assigning decision (CASE 17)", () => {
    for (const decision of ["APPROVED_NEW_HORSE", "KEPT_TEXT_ONLY", "REJECTED"] as const) {
      expect(validateReviewDecision(assigned({ decision }))).toEqual({
        ok: false,
        reason: "ONLY_ASSIGNED_DECISION_CARRIES_HORSE",
      });
    }
  });

  it("requires who decided", () => {
    for (const decidedBy of ["", "   "]) {
      expect(validateReviewDecision(assigned({ decidedBy }))).toEqual({
        ok: false,
        reason: "MISSING_DECIDER",
      });
    }
  });

  it("requires a real decision time", () => {
    expect(validateReviewDecision(assigned({ decidedAt: new Date("not a date") }))).toEqual({
      ok: false,
      reason: "INVALID_DECISION_TIME",
    });
  });
});
