import { describe, expect, it } from "vitest";

import { refreshCredentialDigest } from "./refreshCredential";
import {
  createRefreshSession,
  REFRESH_TTL_MS,
  RefreshSessionError,
  rotateRefreshSession,
} from "./refreshSession";

// Rotation contract: every successful refresh atomically replaces the stored
// session digest, so the credential the client just used can never be used
// again (replay rejected), and the raw credential is never persisted.

interface Row {
  id: number;
  token_hash: Buffer;
  user_id: number;
  created_at: Date;
  expires_at: Date;
}

/** In-memory stand-in for the `refresh_tokens` Prisma delegate. */
function makeFakeDb() {
  const rows: Row[] = [];
  let nextId = 1;

  const refresh_tokens = {
    async findUnique({ where }: { where: { token_hash: Buffer } }) {
      return (
        rows.find((r) => r.token_hash.equals(where.token_hash)) ?? null
      );
    },
    async create({ data }: { data: Omit<Row, "id"> }) {
      const row = { id: nextId++, ...data };
      rows.push(row);
      return row;
    },
    async delete({ where }: { where: { id: number } }) {
      const index = rows.findIndex((r) => r.id === where.id);
      if (index === -1) throw new Error("Record to delete does not exist");
      return rows.splice(index, 1)[0];
    },
  };

  const db = {
    refresh_tokens,
    async $transaction<T>(fn: (tx: typeof db) => Promise<T>): Promise<T> {
      return fn(db);
    },
  };

  return { db, rows };
}

describe("createRefreshSession", () => {
  it("persists only the digest, never the raw credential", async () => {
    const { db, rows } = makeFakeDb();
    const raw = await createRefreshSession(db, 7);

    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(7);
    expect(rows[0].token_hash).toEqual(refreshCredentialDigest(raw));
    const persisted = JSON.stringify(rows, (_k, v) =>
      Buffer.isBuffer(v) ? v.toString("base64url") : v
    );
    expect(persisted).not.toContain(raw);
  });

  it("stamps the advertised TTL on the session", async () => {
    const { db, rows } = makeFakeDb();
    const now = new Date("2026-08-15T12:00:00Z");
    await createRefreshSession(db, 7, now);
    expect(rows[0].expires_at.getTime() - now.getTime()).toBe(REFRESH_TTL_MS);
  });
});

describe("rotateRefreshSession", () => {
  it("issues a new credential and invalidates the old one in one step", async () => {
    const { db, rows } = makeFakeDb();
    const oldRaw = await createRefreshSession(db, 7);

    const rotated = await rotateRefreshSession(db, oldRaw);

    expect(rotated.userId).toBe(7);
    expect(rotated.refreshToken).not.toBe(oldRaw);
    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).toEqual(
      refreshCredentialDigest(rotated.refreshToken)
    );
  });

  it("supports login followed by refresh within the same second", async () => {
    const { db } = makeFakeDb();
    // No sleep, no clock manipulation: both calls run inside one second.
    const raw = await createRefreshSession(db, 7);
    const rotated = await rotateRefreshSession(db, raw);
    expect(rotated.refreshToken).toBeTruthy();
  });

  it("rejects a replayed (already rotated) credential", async () => {
    const { db } = makeFakeDb();
    const oldRaw = await createRefreshSession(db, 7);
    await rotateRefreshSession(db, oldRaw);

    await expect(rotateRefreshSession(db, oldRaw)).rejects.toMatchObject({
      code: "INVALID",
    });
  });

  it("rejects an unknown credential", async () => {
    const { db } = makeFakeDb();
    await expect(
      rotateRefreshSession(db, "not-a-known-credential")
    ).rejects.toBeInstanceOf(RefreshSessionError);
  });

  it("rejects and removes an expired session", async () => {
    const { db, rows } = makeFakeDb();
    const issuedAt = new Date("2026-01-01T00:00:00Z");
    const raw = await createRefreshSession(db, 7, issuedAt);

    const afterExpiry = new Date(
      issuedAt.getTime() + REFRESH_TTL_MS + 1000
    );
    await expect(
      rotateRefreshSession(db, raw, afterExpiry)
    ).rejects.toMatchObject({ code: "EXPIRED" });
    expect(rows).toHaveLength(0);
  });

  it("never persists the raw credentials at any point", async () => {
    const { db, rows } = makeFakeDb();
    const oldRaw = await createRefreshSession(db, 7);
    const rotated = await rotateRefreshSession(db, oldRaw);

    const persisted = JSON.stringify(rows, (_k, v) =>
      Buffer.isBuffer(v) ? v.toString("base64url") : v
    );
    expect(persisted).not.toContain(oldRaw);
    expect(persisted).not.toContain(rotated.refreshToken);
  });
});
