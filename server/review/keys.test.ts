import { describe, expect, it } from "vitest";

import { buildReviewCaseKey, isReviewCaseKey } from "./keys";

/**
 * Deterministic identity of a review case (HOR-142, ADR-018 §5).
 *
 * Idempotent review persistence needs a key derived from durable source
 * evidence, never from document names or insertion time: the assertion key
 * (itself run-independent), the resolver outcome and the resolver contract
 * version. Re-persisting the same outcome is the same case (CASE 11); two
 * assertions that share a horse name are two cases (CASE 12).
 */

const ASSERTION_KEY_A = "a".repeat(64);
const ASSERTION_KEY_B = "b".repeat(64);

describe("buildReviewCaseKey", () => {
  it("derives a 64-hex key from assertion key, outcome and contract version", () => {
    const result = buildReviewCaseKey({
      assertionKey: ASSERTION_KEY_A,
      outcome: "AMBIGUOUS",
      resolverContractVersion: "hor14-v1",
    });

    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.reviewCaseKey).toMatch(/^[0-9a-f]{64}$/);
      expect(isReviewCaseKey(result.reviewCaseKey)).toBe(true);
    }
  });

  it("is deterministic: same inputs, same key", () => {
    const input = {
      assertionKey: ASSERTION_KEY_A,
      outcome: "CONFLICT",
      resolverContractVersion: "hor14-v1",
    } as const;

    expect(buildReviewCaseKey(input)).toEqual(buildReviewCaseKey(input));
  });

  it("separates outcomes for the same assertion", () => {
    const ambiguous = buildReviewCaseKey({
      assertionKey: ASSERTION_KEY_A,
      outcome: "AMBIGUOUS",
      resolverContractVersion: "hor14-v1",
    });
    const conflict = buildReviewCaseKey({
      assertionKey: ASSERTION_KEY_A,
      outcome: "CONFLICT",
      resolverContractVersion: "hor14-v1",
    });

    expect(ambiguous.ok && conflict.ok).toBe(true);
    if (ambiguous.ok && conflict.ok) {
      expect(ambiguous.reviewCaseKey).not.toBe(conflict.reviewCaseKey);
    }
  });

  it("separates assertions even when they would share a horse name (CASE 12)", () => {
    const a = buildReviewCaseKey({
      assertionKey: ASSERTION_KEY_A,
      outcome: "AMBIGUOUS",
      resolverContractVersion: "hor14-v1",
    });
    const b = buildReviewCaseKey({
      assertionKey: ASSERTION_KEY_B,
      outcome: "AMBIGUOUS",
      resolverContractVersion: "hor14-v1",
    });

    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.reviewCaseKey).not.toBe(b.reviewCaseKey);
  });

  it("separates resolver contract versions", () => {
    const v1 = buildReviewCaseKey({
      assertionKey: ASSERTION_KEY_A,
      outcome: "AMBIGUOUS",
      resolverContractVersion: "hor14-v1",
    });
    const v2 = buildReviewCaseKey({
      assertionKey: ASSERTION_KEY_A,
      outcome: "AMBIGUOUS",
      resolverContractVersion: "hor14-v2",
    });

    expect(v1.ok && v2.ok).toBe(true);
    if (v1.ok && v2.ok) expect(v1.reviewCaseKey).not.toBe(v2.reviewCaseKey);
  });

  it("rejects a malformed assertion key instead of hashing garbage", () => {
    for (const assertionKey of ["", "not-a-key", "A".repeat(64), "a".repeat(63)]) {
      expect(
        buildReviewCaseKey({
          assertionKey,
          outcome: "AMBIGUOUS",
          resolverContractVersion: "hor14-v1",
        }),
      ).toEqual({ ok: false, reason: "INVALID_ASSERTION_KEY" });
    }
  });

  it("rejects an unusable contract version", () => {
    for (const resolverContractVersion of ["", "has space", "x".repeat(32)]) {
      expect(
        buildReviewCaseKey({
          assertionKey: ASSERTION_KEY_A,
          outcome: "AMBIGUOUS",
          resolverContractVersion,
        }),
      ).toEqual({ ok: false, reason: "INVALID_CONTRACT_VERSION" });
    }
  });
});
