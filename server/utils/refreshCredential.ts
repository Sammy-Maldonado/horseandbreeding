import { createHash, randomBytes } from "node:crypto";

/**
 * The refresh credential is opaque: 32 cryptographically random bytes,
 * base64url-encoded. It is not a JWT and decodes to nothing.
 *
 * Only its SHA-256 digest is persisted (`refresh_tokens.token_hash`,
 * BINARY(32)); the raw value exists solely in the response to the client.
 */

export function generateRefreshCredential(): string {
  return randomBytes(32).toString("base64url");
}

export function refreshCredentialDigest(credential: string): Buffer {
  return createHash("sha256").update(credential).digest();
}
