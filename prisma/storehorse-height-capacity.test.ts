import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * HOR-82 regression: `storehorse`.`height` capacity.
 *
 * The reference database carried `varchar(4)` while `prisma/schema.prisma` had
 * declared `@db.VarChar(12)` since before Prisma Migrate was adopted — capacity
 * drift in the ADR-011 sense: the column existed everywhere, it was simply
 * narrower than the shape the repository declares. Every one of the 13 height
 * options `pages/sell.vue` offers is 10 or 11 characters, so against `varchar(4)`
 * MariaDB answered `ERROR 1406` and Prisma surfaced `P2000` — no height choice on
 * that form could be stored at all.
 *
 * A grep for `@db.VarChar(12)` in the schema would not protect this. The schema
 * was already correct throughout the defect; what was wrong was the shape the
 * schema actually produces once Prisma renders it. So these tests generate the
 * real artifact — the DDL `prisma migrate diff` emits — and assert on that.
 *
 * `--from-empty --to-schema-datamodel` needs no database connection.
 * `DATABASE_URL` points at a deliberately unreachable address so a regression
 * that starts requiring a live connection fails here rather than silently
 * binding CI to a developer's local MariaDB or to `hbold`.
 */

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const PRISMA_CLI = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url),
);
const SCHEMA_PATH = fileURLToPath(new URL("./schema.prisma", import.meta.url));
const MIGRATIONS_DIR = fileURLToPath(new URL("./migrations", import.meta.url));
const BASELINE_PATH = fileURLToPath(
  new URL("./migrations/0_init/migration.sql", import.meta.url),
);

/** Proves the diff never opens a connection: nothing listens on port 1. */
const UNREACHABLE_DATABASE_URL = "mysql://nobody:nothing@127.0.0.1:1/unreachable";

/** Returns the body of one `CREATE TABLE` block, without its closing clause. */
function createTableBody(sql: string, table: string): string {
  const opening = new RegExp(String.raw`^CREATE TABLE \x60${table}\x60 \(`, "m");
  const start = sql.search(opening);

  if (start === -1) throw new Error(`no CREATE TABLE for \`${table}\``);

  const rest = sql.slice(start);
  const end = rest.search(/^\)/m);

  return end === -1 ? rest : rest.slice(0, end);
}

/** Returns the single column definition line for `column` inside `table`. */
function columnDefinition(sql: string, table: string, column: string): string {
  const line = createTableBody(sql, table)
    .split("\n")
    .find((candidate) => candidate.trim().startsWith(`\`${column}\``));

  if (line === undefined) throw new Error(`no \`${column}\` in \`${table}\``);

  return line.trim().replace(/,$/, "");
}

/** Strips `--` comments and blank lines, then splits on statement terminators. */
function executableStatements(sql: string): string[] {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(";")
    .map((statement) => statement.replace(/\s+/g, " ").trim())
    .filter((statement) => statement.length > 0);
}

describe("generated schema DDL", () => {
  let exitCode: number | null;
  let stderr: string;
  let sql: string;

  beforeAll(() => {
    const result = spawnSync(
      process.execPath,
      [
        PRISMA_CLI,
        "migrate",
        "diff",
        "--from-empty",
        "--to-schema-datamodel",
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

    exitCode = result.status;
    stderr = result.stderr ?? "";
    sql = result.stdout ?? "";
  }, 120_000);

  it("is produced without a database connection", () => {
    expect(stderr).not.toMatch(/can't reach database|P1001/i);
    expect(exitCode).toBe(0);
  });

  it("gives `storehorse`.`height` room for every height the sell form offers", () => {
    // "12.0 - 12.2" is 11 characters — the longest option in pages/sell.vue.
    expect(columnDefinition(sql, "storehorse", "height")).toBe(
      "`height` VARCHAR(12) NOT NULL DEFAULT '0'",
    );
  });

  it("keeps `storehorse_new`.`height` at its own declared width", () => {
    // The previous developer declared 12 for `storehorse` and 4 for
    // `storehorse_new` in the same migration. That differentiation is
    // deliberate, and HOR-82 widened only the first of the two.
    expect(columnDefinition(sql, "storehorse_new", "height")).toBe(
      "`height` VARCHAR(4) NOT NULL DEFAULT '0'",
    );
  });

  it("leaves the other height columns untouched", () => {
    expect(columnDefinition(sql, "horse_details", "height")).toBe(
      "`height` VARCHAR(10) NOT NULL",
    );
    expect(columnDefinition(sql, "competition_history", "height")).toBe(
      "`height` DECIMAL(5, 2) NULL",
    );
  });
});

describe("migration history", () => {
  it("keeps the 0_init baseline faithful to the legacy database", () => {
    // `varchar(4)` is what the pre-Migrate database actually contained. The
    // baseline records history; it is not the place to correct it. Widening it
    // here would make the drift unreproducible and break the legacy restore
    // path, which replays 0_init over a database that already has `varchar(4)`.
    expect(columnDefinition(readFileSync(BASELINE_PATH, "utf8"), "storehorse", "height")).toBe(
      "`height` varchar(4) NOT NULL DEFAULT '0'",
    );
  });

  it("widens the column in one capacity-only statement", () => {
    const directory = readdirSync(MIGRATIONS_DIR)
      .filter((name) => name.endsWith("_storehorse_height_varchar12"))
      .sort()
      .at(-1);

    expect(directory).toBeDefined();

    const statements = executableStatements(
      readFileSync(`${MIGRATIONS_DIR}/${directory}/migration.sql`, "utf8"),
    );

    // One statement, and `MODIFY` rather than `CHANGE`: the column keeps its
    // name, its ordinal position, its NOT NULL, its default, and the table
    // keeps its engine, charset and collation. Anything else in this migration
    // is scope that HOR-82 was explicitly told not to take on.
    expect(statements).toEqual([
      "ALTER TABLE `storehorse` MODIFY `height` VARCHAR(12) NOT NULL DEFAULT '0'",
    ]);
  });
});
