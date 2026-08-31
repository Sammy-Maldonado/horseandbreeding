/**
 * Deterministic identity of a review case (HOR-142, ADR-018 §5).
 *
 * Built like the assertion key (`../ingestion/keys.ts`): SHA-256 over
 * newline-joined durable material — the originating assertion key (itself
 * run- and filename-independent), the resolution outcome and the resolver
 * contract version. Re-persisting the same outcome therefore lands on the
 * same case, while a future resolver revision opens a new one instead of
 * overwriting old evidence. No document names, no timestamps, no counters.
 */
import { createHash } from "node:crypto";

import type { Rejected } from "../ingestion/types";
import type { ReviewOutcome } from "./types";

const KEY_PATTERN = /^[0-9a-f]{64}$/;
const CONTRACT_VERSION_PATTERN = /^[0-9A-Za-z._+-]{1,31}$/;

/** SHA-256 hex, like the assertion key it derives from. */
export function isReviewCaseKey(value: string): boolean {
  return KEY_PATTERN.test(value);
}

export interface ReviewCaseKeyInput {
  assertionKey: string;
  outcome: ReviewOutcome;
  resolverContractVersion: string;
}

export type ReviewCaseKeyResult =
  | { ok: true; reviewCaseKey: string }
  | Rejected<"INVALID_ASSERTION_KEY" | "INVALID_CONTRACT_VERSION">;

export function buildReviewCaseKey(input: ReviewCaseKeyInput): ReviewCaseKeyResult {
  if (!KEY_PATTERN.test(input.assertionKey)) {
    return { ok: false, reason: "INVALID_ASSERTION_KEY" };
  }
  if (!CONTRACT_VERSION_PATTERN.test(input.resolverContractVersion)) {
    return { ok: false, reason: "INVALID_CONTRACT_VERSION" };
  }
  const material = ["identity_review_case", input.assertionKey, input.outcome, input.resolverContractVersion].join(
    "\n",
  );
  return { ok: true, reviewCaseKey: createHash("sha256").update(material, "utf8").digest("hex") };
}
