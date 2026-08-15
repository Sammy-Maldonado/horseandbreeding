import { describe, expect, it } from "vitest";

import {
  generateRefreshCredential,
  refreshCredentialDigest,
} from "./refreshCredential";

// The refresh credential is an opaque random value, not a JWT. Only its
// SHA-256 digest is ever persisted (BINARY(32) in `refresh_tokens.token_hash`),
// so the digest must be deterministic and fixed-width while the credential
// itself must be unpredictable.

describe("generateRefreshCredential", () => {
  it("produces distinct values on every call", () => {
    const seen = new Set(
      Array.from({ length: 100 }, () => generateRefreshCredential())
    );
    expect(seen.size).toBe(100);
  });

  it("encodes 32 bytes of entropy as base64url", () => {
    const credential = generateRefreshCredential();
    // 32 random bytes -> 43 base64url characters, no padding.
    expect(credential).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe("refreshCredentialDigest", () => {
  it("is deterministic for the same credential", () => {
    const credential = generateRefreshCredential();
    expect(refreshCredentialDigest(credential)).toEqual(
      refreshCredentialDigest(credential)
    );
  });

  it("always digests to exactly 32 bytes", () => {
    expect(refreshCredentialDigest("x").length).toBe(32);
    expect(refreshCredentialDigest(generateRefreshCredential()).length).toBe(
      32
    );
  });

  it("differs for different credentials", () => {
    expect(refreshCredentialDigest("a")).not.toEqual(
      refreshCredentialDigest("b")
    );
  });

  it("matches the SHA-256 test vector for 'abc'", () => {
    expect(refreshCredentialDigest("abc").toString("hex")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });
});
