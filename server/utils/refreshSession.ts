import {
  generateRefreshCredential,
  refreshCredentialDigest,
} from "./refreshCredential";

/**
 * Refresh sessions live in `refresh_tokens`: one row per active session,
 * identified only by the SHA-256 digest of the opaque credential.
 *
 * Rotation is the security boundary: every successful refresh replaces the
 * row inside one transaction, so a credential can be redeemed exactly once.
 * A digest miss is a replay (or forgery) and is rejected without leaking
 * whether the credential ever existed.
 */

export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class RefreshSessionError extends Error {
  code: "INVALID" | "EXPIRED";

  constructor(code: "INVALID" | "EXPIRED", message: string) {
    super(message);
    this.name = "RefreshSessionError";
    this.code = code;
  }
}

interface RefreshSessionRow {
  id: number;
  // Uint8Array, not Buffer: Prisma 6 returns `Bytes` columns as Uint8Array.
  token_hash: Uint8Array;
  user_id: number;
  created_at: Date;
  expires_at: Date;
}

/**
 * The slice of the Prisma client the session store needs. Handlers pass the
 * real `PrismaClient`; tests pass an in-memory fake with the same surface.
 */
export interface RefreshSessionDb {
  refresh_tokens: {
    findUnique(args: {
      where: { token_hash: Uint8Array };
    }): Promise<RefreshSessionRow | null>;
    create(args: {
      data: Omit<RefreshSessionRow, "id">;
    }): Promise<RefreshSessionRow>;
    delete(args: { where: { id: number } }): Promise<RefreshSessionRow>;
  };
  $transaction<T>(fn: (tx: RefreshSessionDb) => Promise<T>): Promise<T>;
}

/** Creates a session for the user and returns the raw credential — the only
 * copy that will ever exist. */
export async function createRefreshSession(
  db: RefreshSessionDb,
  userId: number,
  now: Date = new Date()
): Promise<string> {
  const credential = generateRefreshCredential();

  await db.refresh_tokens.create({
    data: {
      token_hash: refreshCredentialDigest(credential),
      user_id: userId,
      created_at: now,
      expires_at: new Date(now.getTime() + REFRESH_TTL_MS),
    },
  });

  return credential;
}

/**
 * Redeems `rawCredential`: validates the session, deletes it, and creates its
 * replacement, all inside one transaction. Returns the session's user and the
 * new raw credential.
 *
 * @throws RefreshSessionError `INVALID` on digest miss (includes replays),
 *         `EXPIRED` when the session outlived its TTL (the row is removed).
 */
export async function rotateRefreshSession(
  db: RefreshSessionDb,
  rawCredential: string,
  now: Date = new Date()
): Promise<{ userId: number; refreshToken: string }> {
  const digest = refreshCredentialDigest(rawCredential);

  return db.$transaction(async (tx) => {
    const session = await tx.refresh_tokens.findUnique({
      where: { token_hash: digest },
    });

    if (!session) {
      throw new RefreshSessionError("INVALID", "Unknown refresh credential");
    }

    if (session.expires_at.getTime() <= now.getTime()) {
      await tx.refresh_tokens.delete({ where: { id: session.id } });
      throw new RefreshSessionError("EXPIRED", "Refresh session expired");
    }

    await tx.refresh_tokens.delete({ where: { id: session.id } });

    const credential = generateRefreshCredential();
    await tx.refresh_tokens.create({
      data: {
        token_hash: refreshCredentialDigest(credential),
        user_id: session.user_id,
        created_at: now,
        expires_at: new Date(now.getTime() + REFRESH_TTL_MS),
      },
    });

    return { userId: session.user_id, refreshToken: credential };
  });
}
