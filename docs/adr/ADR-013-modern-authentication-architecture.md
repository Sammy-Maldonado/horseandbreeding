# ADR-013: Modern authentication architecture

**Status:** Accepted
**Date:** 2026-08-15
**Deciders:** Sammy

---

## Context

The legacy authentication flow predated the HOR-79 database foundation and carried
several structural defects:

- The access token was a JWT signed with `process.env.VITE_JWT_SECRET || "your_jwt_secret"`.
  A missing secret silently fell back to a guessable constant, so every token in such an
  environment was forgeable.
- The refresh token was a second, long-lived JWT persisted **in clear text** in
  `refresh_tokens.token`, alongside a parallel `access_tokens` table that persisted every
  issued access token in clear text. Both tables were write-only: no code anywhere in the
  repository ever read them back, so they provided no revocation and no audit — only a
  growing store of usable credentials.
- Both token tables carried a `client_id` foreign key into the OAuth `clients` registry,
  which has no rows and no consumer (HOR-81: PARTIALLY IMPLEMENTED). Inserting a token
  required either fabricating an OAuth client or violating the constraint.
- `user_roles.role_name` was globally unique, so only one user in the entire system could
  hold the role `User`. Registration of a second user failed at the role step.

HOR-79 established the prerequisites: `users` is InnoDB, real foreign keys into
`users.id` are enforceable, and Prisma Migrate versions every schema change (ADR-012).

---

## Decision

1. **The access token is a short-lived, stateless, signed JWT.** HS256, one-hour TTL,
   carrying `userId`, `email`, `mobile`, and a cryptographically unique `jti`
   (`crypto.randomUUID()` — never timestamp-derived). Verification is purely
   cryptographic; **access tokens are never persisted**.
2. **A missing or placeholder JWT secret is a hard, controlled failure.**
   `requireJwtSecret()` throws when `VITE_JWT_SECRET` is absent, empty, or equal to the
   historical placeholder `your_jwt_secret`. There is no fallback value, and the error
   message never contains the secret.
3. **The refresh credential is an opaque, cryptographically random value — not a JWT.**
   The server generates 32 bytes from `node:crypto` `randomBytes` (base64url, 43
   characters). The client receives the raw value; the database persists **only its
   SHA-256 digest** in `refresh_tokens.token_hash BINARY(32) UNIQUE`. The raw credential
   is never stored, never logged, and cannot be recovered from a database leak.
4. **The refresh session belongs to the user alone.** `refresh_tokens.user_id` is a real
   enforced foreign key to `users.id`. The `client_id` column and its foreign key into
   the unused OAuth `clients` registry are removed; no OAuth credential is fabricated to
   satisfy an unused constraint. The `clients` and `authorization_codes` tables
   themselves remain, as classified by HOR-81.
5. **Every refresh rotates the credential inside one database transaction:** hash the
   presented credential → locate the session by digest → reject unknown digests
   (`INVALID`, which also covers replay) → delete expired sessions (`EXPIRED`) → issue a
   new access JWT with a fresh `jti` → generate a new random credential → replace the old
   session row with the new digest → commit. Replaying a rotated credential misses the
   digest lookup and is rejected. Refresh sessions live seven days.
6. **`access_tokens` is dropped** by the curated migration
   `20260815101514_modern_auth_sessions`, under the extreme safe-deletion gate: the table
   was write-only (zero readers repository-wide), held zero rows, had no incoming foreign
   keys, no planned dependency (HOR-81), and its revocation/audit responsibility is
   replaced by the short access TTL plus rotating refresh sessions. The removal was
   rehearsed green on a disposable database before touching `hbold`.
7. **Role names are unique per user, not globally.** `user_roles` enforces
   `UNIQUE(role_name, user_id)`: two users may both hold `User`; the same user cannot
   hold the same role twice. (Schema shape delivered by HOR-79; the handlers now use the
   compound selector.)

---

## Rationale

- Stateless verification removes the per-request token-table read the legacy design
  implied but never implemented, and the one-hour TTL bounds the damage of a leaked
  access token without server-side revocation state.
- A random opaque refresh credential has no decodable structure and no signature to
  attack; digest-only persistence means the database never contains a usable credential.
- Single-transaction rotation makes redemption exactly-once by construction: two
  concurrent redemptions of the same credential cannot both find the digest row.
- Removing the fallback secret converts a silent forgeability hole into an immediate,
  visible startup failure — the failure mode an operator can actually fix.
- Deleting `access_tokens` rather than leaving it beside the stateless design prevents
  the permanent coexistence of a modern mechanism and an unused legacy credential store,
  which would invite future writes to a table nothing reads.

---

## Consequences

### Positive

- No stored credential in the database is usable if leaked: passwords are bcrypt hashes,
  refresh sessions are SHA-256 digests, access tokens are not stored at all.
- Replay of a rotated refresh credential is structurally rejected.
- Multiple users can register through the normal flow; the role model no longer blocks
  the second user.
- The auth schema matches `prisma/schema.prisma` exactly — the residual `migrate diff`
  contains only the ADR-012 deferral list.

### Negative

- An access token cannot be revoked before its one-hour expiry; earlier revocation would
  require a server-side denylist that does not exist yet.
- Losing a refresh credential mid-rotation (e.g. a client crash between server commit and
  client storage) invalidates the session and forces a new login.
- `EXPIRED` and `INVALID` are indistinguishable to the client by design; support
  diagnostics must use server-side evidence.

---

## Alternatives Considered

### Keep persisting access tokens for revocation/audit — Rejected

The legacy table was never read, so it provided neither. A real revocation store is a
deliberate future feature with its own issue, not a byproduct of keeping an unused table.

### Refresh token as a long-lived JWT (legacy mechanism) — Rejected

A signed JWT in clear text in the database is a usable credential at rest, and statelessly
verifiable refresh tokens cannot be rotated or replay-rejected without a store anyway —
the JWT added attack surface without removing the storage need.

### Fabricate an OAuth client row to satisfy `client_id` — Rejected

Inventing business data to satisfy an unused constraint inverts the dependency: the
schema must serve the domain, not the reverse. The modern session needs only the user.

### Encrypt (rather than hash) the refresh credential — Rejected

Encryption is reversible and creates a key-management problem; the server never needs the
raw value back, so a one-way digest is strictly safer.

---

## Review Triggers

- A revocation or session-management feature requires listing/invalidating live sessions
  → extend this ADR (e.g. session metadata, denylist).
- Access-token claims change (roles/scopes embedded vs. per-request lookup).
- The OAuth `clients` / `authorization_codes` structures are activated or removed by a
  dedicated issue → their relationship to refresh sessions must be re-decided.
- HOR-77 (transactional registration) and HOR-78 (safe public error contract) land —
  both touch the same handlers.
