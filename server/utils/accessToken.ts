import { randomUUID } from "node:crypto";

import jwt from "jsonwebtoken";

import { requireJwtSecret } from "./jwtSecret";

/**
 * Issues the short-lived access JWT. Verification is stateless
 * (`verifyToken.ts`); the token is never persisted.
 *
 * `jti` is a random UUID, not a timestamp derivative: `jwt.sign` over an
 * identical payload in the same second is otherwise deterministic, and a
 * login followed by an immediate refresh used to produce byte-identical
 * tokens.
 */

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;

export interface AccessTokenUser {
  id: number;
  email: string;
  mobile: string;
}

export function issueAccessToken(user: AccessTokenUser): string {
  return jwt.sign(
    { userId: user.id, email: user.email, mobile: user.mobile },
    requireJwtSecret(),
    {
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      jwtid: randomUUID(),
    }
  );
}
