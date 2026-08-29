/**
 * Canonical write-up rules (HOR-9, ADR-005, ADR-018).
 *
 * A mare has at most one canonical maternal write-up, keyed to her
 * `storehorse.horse_id` and reused by every foal in her line. This module
 * decides — purely, from content alone — what an incoming write-up means for
 * that single row:
 *
 *   CREATE          the mare has no write-up yet
 *   REUSE_IDENTICAL the text is the same one already stored (after
 *                   normalisation), typically read again from another
 *                   catalogue: one more assertion points at the same row
 *   CONFLICT        the text differs: the stored write-up is never overwritten;
 *                   the variant stays in the assertion ledger for human review
 *
 * `(SEE ABOVE)` is a reference to an existing write-up, never content.
 * No Prisma, no Nitro, no database.
 */
import { createHash } from "node:crypto";

import type { Rejected, WriteupLifecycleState } from "./types";

/** A bare "see above" marker, with any bracket, spacing or case the catalogues use. */
const SEE_ABOVE = /^[\s(\[]*see\s+above[\s)\].:;,]*$/i;

/**
 * Formatting-only normalisation. Case, punctuation and words are content and
 * stay untouched; line endings, whitespace runs and Unicode composition are not.
 */
export function normaliseWriteupContent(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Hex SHA-256 of the normalised content: identical text ⇒ identical hash. */
export function writeupContentHash(text: string): string {
  return createHash("sha256").update(normaliseWriteupContent(text), "utf8").digest("hex");
}

export function isSeeAboveReference(text: string): boolean {
  return SEE_ABOVE.test(text);
}

export interface ExistingWriteup {
  contentHash: string;
  lifecycleState: WriteupLifecycleState;
}

export interface WriteupDecisionInput {
  /** The mare's current canonical write-up, or null when she has none. */
  existing: ExistingWriteup | null;
  /** The write-up text extracted from the source document. */
  content: string;
}

export type WriteupDecision = "CREATE" | "REUSE_IDENTICAL" | "CONFLICT";

export type WriteupDecisionResult =
  | { ok: true; decision: WriteupDecision; contentHash: string }
  | Rejected<"SEE_ABOVE_REFERENCE" | "EMPTY_CONTENT">;

export function decideWriteupPersistence(input: WriteupDecisionInput): WriteupDecisionResult {
  if (isSeeAboveReference(input.content)) {
    return { ok: false, reason: "SEE_ABOVE_REFERENCE" };
  }
  const normalised = normaliseWriteupContent(input.content);
  if (normalised.length === 0) {
    return { ok: false, reason: "EMPTY_CONTENT" };
  }
  const contentHash = writeupContentHash(normalised);

  if (input.existing === null) {
    return { ok: true, decision: "CREATE", contentHash };
  }
  if (input.existing.contentHash === contentHash) {
    return { ok: true, decision: "REUSE_IDENTICAL", contentHash };
  }
  // Whatever the lifecycle state — imported, approved or corrected — a
  // differing text is a conflict for review, never a silent replacement.
  return { ok: true, decision: "CONFLICT", contentHash };
}
