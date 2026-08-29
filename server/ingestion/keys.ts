/**
 * Deterministic identity keys of the ingestion model (HOR-9, ADR-018).
 *
 * Idempotent, resumable ingestion needs every persisted thing to have an
 * identity that comes from the source, not from the moment it was written:
 *
 *   - `source_document.content_fingerprint` — SHA-256 of the document bytes,
 *     the same digest the extractor reports as `source_fingerprint_sha256`.
 *   - `ingestion_run.run_key` — fingerprint + extractor version + output
 *     contract version. Re-running the same code over the same bytes is the
 *     same run; new code over the same bytes is a new run.
 *   - `source_assertion.assertion_key` — digest of document fingerprint, node,
 *     assertion kind and ordinal. It does not include the run on purpose: the
 *     assertion is identified by where it sits in the source, so a re-run
 *     upserts the same rows instead of duplicating them.
 *
 * Pure: no Prisma, no Nitro, no I/O beyond `node:crypto`.
 */
import { createHash } from "node:crypto";

import type { Rejected } from "./types";

const FINGERPRINT = /^[0-9a-f]{64}$/;
/** Versions are short, separator-free tokens so the readable run key fits 128 chars. */
const VERSION = /^[0-9A-Za-z._+-]{1,31}$/;
const RUN_KEY_SEPARATOR = ":";

/** Lowercase hex SHA-256 of the raw document bytes. */
export function contentFingerprint(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function isContentFingerprint(value: string): boolean {
  return FINGERPRINT.test(value);
}

export interface RunKeyInput {
  contentFingerprint: string;
  extractorVersion: string;
  outputContractVersion: string;
}

export type RunKeyResult =
  | { ok: true; runKey: string }
  | Rejected<"INVALID_FINGERPRINT" | "INVALID_VERSION">;

/** `<fingerprint>:<extractor version>:<output contract version>` — at most 128 characters. */
export function buildRunKey(input: RunKeyInput): RunKeyResult {
  if (!isContentFingerprint(input.contentFingerprint)) {
    return { ok: false, reason: "INVALID_FINGERPRINT" };
  }
  if (!VERSION.test(input.extractorVersion) || !VERSION.test(input.outputContractVersion)) {
    return { ok: false, reason: "INVALID_VERSION" };
  }
  return {
    ok: true,
    runKey: [input.contentFingerprint, input.extractorVersion, input.outputContractVersion].join(
      RUN_KEY_SEPARATOR,
    ),
  };
}

export interface AssertionKeyInput {
  contentFingerprint: string;
  /** Extractor node id of the source paragraph. */
  nodeId: string;
  assertionKind: string;
  /** Position of this assertion among those of the same kind in the node (0-based). */
  ordinal: number;
}

export type AssertionKeyResult =
  | { ok: true; assertionKey: string }
  | Rejected<"INVALID_FINGERPRINT" | "INVALID_NODE_ID" | "INVALID_ORDINAL">;

/** Hex SHA-256 over the source coordinates of the assertion; run-independent. */
export function buildAssertionKey(input: AssertionKeyInput): AssertionKeyResult {
  if (!isContentFingerprint(input.contentFingerprint)) {
    return { ok: false, reason: "INVALID_FINGERPRINT" };
  }
  if (input.nodeId.length === 0) {
    return { ok: false, reason: "INVALID_NODE_ID" };
  }
  if (!Number.isInteger(input.ordinal) || input.ordinal < 0) {
    return { ok: false, reason: "INVALID_ORDINAL" };
  }
  const material = [
    input.contentFingerprint,
    input.nodeId,
    input.assertionKind,
    String(input.ordinal),
  ].join("\n");

  return { ok: true, assertionKey: createHash("sha256").update(material, "utf8").digest("hex") };
}
