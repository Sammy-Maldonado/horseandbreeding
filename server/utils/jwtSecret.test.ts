import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { requireJwtSecret } from "./jwtSecret";

// The historical fallback `|| "your_jwt_secret"` silently signed tokens with a
// public literal. The modern contract is a hard controlled failure: no secret,
// no token — and the placeholder itself is treated as absent.

const ENV_KEY = "VITE_JWT_SECRET";
let saved: string | undefined;

beforeEach(() => {
  saved = process.env[ENV_KEY];
});

afterEach(() => {
  if (saved === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = saved;
  }
});

describe("requireJwtSecret", () => {
  it("returns the configured secret", () => {
    process.env[ENV_KEY] = "a".repeat(64);
    expect(requireJwtSecret()).toBe("a".repeat(64));
  });

  it("throws when the variable is missing", () => {
    delete process.env[ENV_KEY];
    expect(() => requireJwtSecret()).toThrowError(/JWT secret/);
  });

  it("throws when the variable is empty", () => {
    process.env[ENV_KEY] = "";
    expect(() => requireJwtSecret()).toThrowError(/JWT secret/);
  });

  it("rejects the historical placeholder literal", () => {
    process.env[ENV_KEY] = "your_jwt_secret";
    expect(() => requireJwtSecret()).toThrowError(/JWT secret/);
  });

  it("never includes the secret value in the failure message", () => {
    process.env[ENV_KEY] = "your_jwt_secret";
    try {
      requireJwtSecret();
      expect.unreachable("requireJwtSecret must throw");
    } catch (error) {
      expect((error as Error).message).not.toContain("your_jwt_secret");
    }
  });
});
