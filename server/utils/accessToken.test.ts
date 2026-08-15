import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ACCESS_TOKEN_TTL_SECONDS, issueAccessToken } from "./accessToken";

// jwt.sign over an identical payload in the same second is deterministic; two
// logins (or a login plus an immediate refresh) used to collide on the unique
// token digest. The `jti` claim exists to make every issued token unique
// regardless of the clock.

const ENV_KEY = "VITE_JWT_SECRET";
let saved: string | undefined;

const user = { id: 42, email: "a@example.com", mobile: "0000000000" };

beforeEach(() => {
  saved = process.env[ENV_KEY];
  process.env[ENV_KEY] = "test-secret-that-is-not-the-placeholder";
});

afterEach(() => {
  if (saved === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = saved;
  }
});

describe("issueAccessToken", () => {
  it("signs a verifiable token carrying userId, email and mobile", () => {
    const token = issueAccessToken(user);
    const decoded = jwt.verify(
      token,
      process.env[ENV_KEY] as string
    ) as jwt.JwtPayload;
    expect(decoded.userId).toBe(42);
    expect(decoded.email).toBe("a@example.com");
    expect(decoded.mobile).toBe("0000000000");
  });

  it("gives two tokens issued in the same second distinct jti claims", () => {
    const first = jwt.decode(issueAccessToken(user)) as jwt.JwtPayload;
    const second = jwt.decode(issueAccessToken(user)) as jwt.JwtPayload;
    expect(first.jti).toBeTruthy();
    expect(second.jti).toBeTruthy();
    expect(first.jti).not.toBe(second.jti);
    // Two same-second tokens differing only by jti must still serialize to
    // different strings — that is the whole point.
    expect(issueAccessToken(user)).not.toBe(issueAccessToken(user));
  });

  it("uses a jti that is not derived from the timestamp", () => {
    const decoded = jwt.decode(issueAccessToken(user)) as jwt.JwtPayload;
    // A UUIDv4 (or equivalent random id) never parses as an epoch number.
    expect(Number.isNaN(Number(decoded.jti))).toBe(true);
    expect(String(decoded.jti).length).toBeGreaterThanOrEqual(16);
  });

  it("expires in exactly the advertised TTL", () => {
    const decoded = jwt.decode(issueAccessToken(user)) as jwt.JwtPayload;
    expect(decoded.exp! - decoded.iat!).toBe(ACCESS_TOKEN_TTL_SECONDS);
  });

  it("refuses to sign without a real secret", () => {
    process.env[ENV_KEY] = "your_jwt_secret";
    expect(() => issueAccessToken(user)).toThrowError(/JWT secret/);
  });
});
