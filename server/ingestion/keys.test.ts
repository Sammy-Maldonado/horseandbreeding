import { describe, expect, it } from "vitest";

import {
  buildAssertionKey,
  buildRunKey,
  contentFingerprint,
  isContentFingerprint,
} from "./keys";

const SHA256_EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const SHA256_ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

describe("contentFingerprint", () => {
  it("is the lowercase hex SHA-256 of the document bytes, like the extractor", () => {
    expect(contentFingerprint(new Uint8Array())).toBe(SHA256_EMPTY);
    expect(contentFingerprint(new TextEncoder().encode("abc"))).toBe(SHA256_ABC);
  });

  it("recognises a well-formed fingerprint and nothing else", () => {
    expect(isContentFingerprint(SHA256_ABC)).toBe(true);
    expect(isContentFingerprint(SHA256_ABC.toUpperCase())).toBe(false);
    expect(isContentFingerprint(SHA256_ABC.slice(1))).toBe(false);
    expect(isContentFingerprint("")).toBe(false);
  });
});

describe("buildRunKey", () => {
  const input = {
    contentFingerprint: SHA256_ABC,
    extractorVersion: "1.0.0",
    outputContractVersion: "1",
  };

  it("is deterministic and readable: fingerprint, extractor and contract versions", () => {
    const key = buildRunKey(input);

    expect(key).toEqual({ ok: true, runKey: `${SHA256_ABC}:1.0.0:1` });
    expect(buildRunKey({ ...input })).toEqual(key);
  });

  it("changes when any component changes, so a re-run with new code is a new run", () => {
    const base = buildRunKey(input);
    const otherDocument = buildRunKey({ ...input, contentFingerprint: SHA256_EMPTY });
    const otherExtractor = buildRunKey({ ...input, extractorVersion: "1.0.1" });
    const otherContract = buildRunKey({ ...input, outputContractVersion: "2" });

    expect(new Set([base, otherDocument, otherExtractor, otherContract].map((r) => JSON.stringify(r))).size).toBe(4);
  });

  it("never exceeds the 128 characters of ingestion_run.run_key", () => {
    const longest = buildRunKey({
      contentFingerprint: SHA256_ABC,
      extractorVersion: "a".repeat(31),
      outputContractVersion: "b".repeat(31),
    });

    expect(longest.ok).toBe(true);
    if (longest.ok) expect(longest.runKey.length).toBeLessThanOrEqual(128);
  });

  it.each([
    ["bad fingerprint", { ...input, contentFingerprint: "abc" }, "INVALID_FINGERPRINT"],
    ["empty extractor version", { ...input, extractorVersion: "" }, "INVALID_VERSION"],
    ["version with separator", { ...input, extractorVersion: "1:0" }, "INVALID_VERSION"],
    ["version too long", { ...input, outputContractVersion: "x".repeat(32) }, "INVALID_VERSION"],
  ])("rejects %s", (_label, candidate, reason) => {
    expect(buildRunKey(candidate)).toEqual({ ok: false, reason });
  });
});

describe("buildAssertionKey", () => {
  const input = {
    contentFingerprint: SHA256_ABC,
    nodeId: "n-000042",
    assertionKind: "COMPETITION_RESULT",
    ordinal: 2,
  } as const;

  it("is a deterministic 64-character hex digest", () => {
    const key = buildAssertionKey(input);

    expect(key).toEqual({ ok: true, assertionKey: expect.stringMatching(/^[0-9a-f]{64}$/) });
    expect(buildAssertionKey({ ...input })).toEqual(key);
  });

  it("differs per document, node, kind and ordinal", () => {
    const variants = [
      buildAssertionKey(input),
      buildAssertionKey({ ...input, contentFingerprint: SHA256_EMPTY }),
      buildAssertionKey({ ...input, nodeId: "n-000043" }),
      buildAssertionKey({ ...input, assertionKind: "RIDER" }),
      buildAssertionKey({ ...input, ordinal: 3 }),
    ].map((r) => JSON.stringify(r));

    expect(new Set(variants).size).toBe(5);
  });

  it("does not depend on the run: the same document re-run yields the same key", () => {
    // Idempotent re-ingestion relies on this — the key is the assertion's
    // identity in the source, not the identity of the run that read it.
    expect(buildAssertionKey(input)).toEqual(buildAssertionKey({ ...input }));
  });

  it.each([
    ["bad fingerprint", { ...input, contentFingerprint: "nope" }, "INVALID_FINGERPRINT"],
    ["empty node id", { ...input, nodeId: "" }, "INVALID_NODE_ID"],
    ["negative ordinal", { ...input, ordinal: -1 }, "INVALID_ORDINAL"],
    ["fractional ordinal", { ...input, ordinal: 1.5 }, "INVALID_ORDINAL"],
  ])("rejects %s", (_label, candidate, reason) => {
    expect(buildAssertionKey(candidate)).toEqual({ ok: false, reason });
  });
});
