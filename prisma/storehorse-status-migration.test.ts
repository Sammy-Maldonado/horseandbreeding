import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Regression contract for `storehorse.status` (HOR-94).
 *
 * HOR-79's migration `20260815092730_modernise_auth_foundation` added
 * `storehorse.status INTEGER NULL` with no backfill. On a migrated legacy
 * restore every historical row therefore held NULL, and because SQL
 * three-valued logic never matches `WHERE status = 1` against NULL, every
 * horse query that filters on the active status returned nothing — search,
 * pagination and pedigree came back empty and the maternal-line endpoints
 * failed with 500.
 *
 * These tests pin the reconciled model so the defect cannot return:
 *
 *   1 = active horse — the default, and the state of every legacy row
 *  -1 = marketplace listing created by the public sell form
 *  NULL = not a valid state
 *
 * Everything here reads committed files or generates SQL offline; no test
 * connects to `hbold` or any database.
 */

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const PRISMA_CLI = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url),
);
const SCHEMA_PATH = fileURLToPath(new URL("./schema.prisma", import.meta.url));
const MIGRATIONS_DIR = fileURLToPath(
  new URL("./migrations", import.meta.url),
);

/** Proves the diff never opens a connection: nothing listens on port 1. */
const UNREACHABLE_DATABASE_URL = "mysql://nobody:nothing@127.0.0.1:1/unreachable";

const BACKFILL_MIGRATION_SUFFIX = "_storehorse_status_active_backfill";

/**
 * Extracts one CREATE TABLE block from a migration script, so assertions can
 * target the `storehorse` table without matching the unrelated `status`
 * columns other tables legitimately declare.
 */
function createTableBlock(sql: string, table: string): string {
  const start = sql.indexOf(`CREATE TABLE \`${table}\``);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = sql.indexOf(";", start);
  expect(end).toBeGreaterThan(start);
  return sql.slice(start, end);
}

function migrationSql(folder: string): string {
  return readFileSync(join(MIGRATIONS_DIR, folder, "migration.sql"), "utf8");
}

describe("migration history for storehorse.status", () => {
  const folders = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  it("keeps the faithful 0_init baseline free of the status column", () => {
    const storehorse = createTableBlock(migrationSql("0_init"), "storehorse");

    expect(storehorse).not.toMatch(/`status`/);
  });

  it("preserves the applied HOR-79 migration exactly as history records it", () => {
    // An applied migration is history. The defect is corrected by a NEW
    // migration, never by editing the one already recorded as applied.
    const sql = migrationSql("20260815092730_modernise_auth_foundation");

    expect(sql).toMatch(/ADD COLUMN `status` INTEGER NULL/);
  });

  it("ships a dedicated backfill migration ordered after the column add", () => {
    const backfill = folders.filter((name) =>
      name.endsWith(BACKFILL_MIGRATION_SUFFIX),
    );

    expect(backfill).toHaveLength(1);
    expect(backfill[0] > "20260815092730_modernise_auth_foundation").toBe(true);
  });

  describe("the backfill migration", () => {
    let sql: string;

    beforeAll(() => {
      const folder = folders.find((name) =>
        name.endsWith(BACKFILL_MIGRATION_SUFFIX),
      );
      sql = folder ? migrationSql(folder) : "";
    });

    it("backfills every NULL row to the active status", () => {
      expect(sql).toMatch(
        /UPDATE `storehorse`\s+SET `status` = 1\s+WHERE `status` IS NULL/,
      );
    });

    it("hardens the column to NOT NULL with the active default", () => {
      expect(sql).toMatch(
        /ALTER TABLE `storehorse`\s+MODIFY `status` INTEGER NOT NULL DEFAULT 1/,
      );
    });

    it("runs the backfill before removing nullability", () => {
      // In strict mode MODIFY ... NOT NULL fails while NULL rows remain; in
      // non-strict mode it silently coerces NULL to 0, a value with no meaning
      // in this model. Either outcome is prevented by ordering.
      const update = sql.search(/UPDATE `storehorse`/);
      const modify = sql.search(/ALTER TABLE `storehorse`/);

      expect(update).toBeGreaterThanOrEqual(0);
      expect(modify).toBeGreaterThan(update);
    });

    it("touches no column other than status", () => {
      // Data preservation: the reconciliation changes exactly one column.
      // Assert against executable statements only — the migration's comment
      // block legitimately mentions keywords like MODIFY.
      const statements = sql
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("--"))
        .join("\n");

      expect(statements).not.toMatch(/`(?!status`)[a-z_]+`\s*=/);
      expect(statements.match(/MODIFY/g) ?? []).toHaveLength(1);
      expect(statements).not.toMatch(/\b(DROP|DELETE|TRUNCATE|INSERT)\b/i);
    });
  });
});

describe("schema-declared status column", () => {
  let sql: string;

  beforeAll(() => {
    const result = spawnSync(
      process.execPath,
      [
        PRISMA_CLI,
        "migrate",
        "diff",
        "--from-empty",
        "--to-schema",
        SCHEMA_PATH,
        "--script",
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, DATABASE_URL: UNREACHABLE_DATABASE_URL },
      },
    );

    expect(result.status).toBe(0);
    sql = result.stdout ?? "";
  }, 120_000);

  it("generates storehorse.status as NOT NULL DEFAULT 1", () => {
    // The schema and the migrated database must agree, or the residual
    // `migrate diff` (ADR-012) gains an undocumented entry and the nullable
    // state the defect depended on comes back for new environments.
    const storehorse = createTableBlock(sql, "storehorse");

    expect(storehorse).toMatch(/`status` INTEGER NOT NULL DEFAULT 1/);
  });
});
