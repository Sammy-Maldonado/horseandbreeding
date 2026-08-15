/**
 * The single authority for the JWT signing secret.
 *
 * The legacy handlers fell back to the public literal `"your_jwt_secret"`
 * whenever the environment variable was absent, silently signing production
 * tokens with a guessable key. The modern contract is a hard controlled
 * failure: no real secret, no token. The error message never carries the
 * configured value.
 */

const PLACEHOLDER = "your_jwt_secret";

export function requireJwtSecret(): string {
  const secret = process.env.VITE_JWT_SECRET;

  if (!secret || secret === PLACEHOLDER) {
    throw new Error(
      "JWT secret is not configured: set VITE_JWT_SECRET to a real value"
    );
  }

  return secret;
}
