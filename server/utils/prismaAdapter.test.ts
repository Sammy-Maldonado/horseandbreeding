import { describe, expect, it, afterEach } from "vitest";

import { createMariaDbAdapter, parseDatabaseUrl } from "./prismaAdapter";

/**
 * Prisma 7 clients cannot connect without a driver adapter (ADR-015). Every
 * endpoint builds its own adapter through this helper, so the URL parsing and
 * the pool settings it encodes are load-bearing for every query in the
 * application. None of these tests opens a connection.
 */

const EXAMPLE_URL = "mysql://app:s3cret@db.example.test:3307/hbold";

describe("parseDatabaseUrl", () => {
  it("extracts host, port, credentials and database from a mysql URL", () => {
    const config = parseDatabaseUrl(EXAMPLE_URL);

    expect(config.host).toBe("db.example.test");
    expect(config.port).toBe(3307);
    expect(config.user).toBe("app");
    expect(config.password).toBe("s3cret");
    expect(config.database).toBe("hbold");
  });

  it("defaults the port to 3306 when the URL declares none", () => {
    expect(parseDatabaseUrl("mysql://a:b@localhost/hbold").port).toBe(3306);
  });

  it("decodes percent-encoded credentials", () => {
    const config = parseDatabaseUrl("mysql://user%40x:p%40ss@h/db");

    expect(config.user).toBe("user@x");
    expect(config.password).toBe("p@ss");
  });

  it("keeps v6 connection-behaviour parity in the pool settings", () => {
    const config = parseDatabaseUrl(EXAMPLE_URL);

    // Prisma 6 waited 5 s to connect and recycled idle connections after
    // 300 s; the adapter's own defaults (1 s / 1800 s) silently change both.
    expect(config.connectTimeout).toBe(5_000);
    expect(config.idleTimeout).toBe(300);
    expect(config.connectionLimit).toBe(10);
    expect(config.acquireTimeout).toBe(10_000);
  });

  it("rejects an invalid URL without echoing its contents", () => {
    expect(() => parseDatabaseUrl("not-a-url")).toThrowError(
      /DATABASE_URL is not a valid connection URL/,
    );
    try {
      parseDatabaseUrl("mysql://leak:leak@:::/broken");
    } catch (error) {
      expect(String((error as Error).message)).not.toContain("leak");
    }
  });
});

describe("createMariaDbAdapter", () => {
  const original = process.env.DATABASE_URL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = original;
    }
  });

  it("throws a configuration error when DATABASE_URL is absent", () => {
    delete process.env.DATABASE_URL;

    expect(() => createMariaDbAdapter()).toThrowError(
      /DATABASE_URL is not configured/,
    );
  });

  it("builds a fresh adapter instance per call (one pool per client)", () => {
    process.env.DATABASE_URL = EXAMPLE_URL;

    const first = createMariaDbAdapter();
    const second = createMariaDbAdapter();

    expect(first).not.toBe(second);
    expect(first.provider).toBe("mysql");
    expect(first.adapterName).toContain("adapter-mariadb");
  });
});
