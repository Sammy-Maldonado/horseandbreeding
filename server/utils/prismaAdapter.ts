import { PrismaMariaDb } from "@prisma/adapter-mariadb";

/**
 * Prisma 7 driver-adapter helper (ADR-015, decision 8).
 *
 * Every endpoint keeps constructing its own PrismaClient, and each client
 * receives its own adapter instance: the adapter factory creates one pool per
 * connected client, so a per-request `$disconnect()` closes only that client's
 * pool and can never tear down a pool another in-flight request is using.
 * This module centralises connection-config construction ONLY — it owns no
 * state, caches nothing and never opens a connection itself.
 */

export interface MariaDbConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  connectTimeout: number;
  acquireTimeout: number;
  idleTimeout: number;
}

/**
 * Parses a `mysql://` connection URL into the mariadb pool configuration.
 *
 * The pool settings are deliberate, not defaults (ADR-015 consequences):
 * - `connectTimeout` 5000 ms — Prisma 6 parity; the adapter's own 1 s default
 *   is too aggressive for a cold database.
 * - `idleTimeout` 300 s — Prisma 6 parity; the adapter defaults to 1800 s.
 * - `connectionLimit` 10 / `acquireTimeout` 10000 ms — adapter defaults, kept
 *   explicit so a future change is a conscious decision.
 *
 * Error messages never echo the URL or its credentials (CLAUDE.md §7).
 */
export function parseDatabaseUrl(url: string): MariaDbConnectionConfig {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("DATABASE_URL is not a valid connection URL");
  }

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    connectionLimit: 10,
    connectTimeout: 5_000,
    acquireTimeout: 10_000,
    idleTimeout: 300,
  };
}

/** Builds a fresh adapter instance — one per PrismaClient, one pool per client. */
export function createMariaDbAdapter(): PrismaMariaDb {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }

  return new PrismaMariaDb(parseDatabaseUrl(url));
}
