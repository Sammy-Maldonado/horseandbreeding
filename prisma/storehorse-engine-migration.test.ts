import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Migration contract for the `storehorse` engine wave (HOR-156, ADR-012).
 *
 * HOR-13 Step F writes `storehorse` together with `source_assertion`,
 * `canonical_change_audit` and the identity-review tables inside ONE
 * transaction, and ADR-018 forbids a partial canonical state. MyISAM ignores
 * ROLLBACK, so before that first canonical write `storehorse` must be InnoDB.
 * The Prisma Schema Language cannot express a storage engine, so — exactly as
 * HOR-79 did for `users` — the conversion is a hand-written migration whose
 * only executable statement is the engine change.
 *
 * These tests pin the wave's scope: ONE table, ONE statement, nothing else —
 * no foreign key, no charset, no column, index or data change. Everything
 * here reads committed files or generates SQL offline; no test connects to
 * `hbold` or any database.
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

const ENGINE_MIGRATION_SUFFIX = "_storehorse_engine_innodb";
const USERS_ENGINE_MIGRATION = "20260815092729_users_engine_innodb";
/** The last migration of the chain already integrated in DEV. */
const HOR142_MIGRATION = "20260831143000_hor142_identity_review_persistence";
/**
 * HOR-13 Step D.1 is applied to `hbold` but still lives on the HOR-13 issue
 * branch; the engine wave must sort after it so the chain stays monotonic
 * once both are integrated.
 */
const HOR13_D1_TIMESTAMP = "20260905214500";

const JUNCTION_TABLES = [
  "storehorse_has_approvedby",
  "studbook_has_storehorse",
  "storehorse_has_diciplinevalues",
];

function migrationSql(folder: string): string {
  return readFileSync(join(MIGRATIONS_DIR, folder, "migration.sql"), "utf8");
}

/** Comment lines (`--`) are documentation, never executed. */
function headerOf(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => line.trimStart().startsWith("--"))
    .join("\n");
}

/** Executable statements, whitespace-normalised, without the comment block. */
function executableStatements(sql: string): string[] {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(";")
    .map((statement) => statement.replace(/\s+/g, " ").trim())
    .filter((statement) => statement.length > 0);
}

function createTableBlock(sql: string, table: string): string {
  const start = sql.indexOf(`CREATE TABLE \`${table}\``);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = sql.indexOf(";", start);
  expect(end).toBeGreaterThan(start);
  return sql.slice(start, end);
}

describe("migration history for the storehorse engine wave", () => {
  const folders = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  it("keeps the faithful 0_init baseline declaring storehorse as MyISAM", () => {
    // History is never rewritten: the legacy engine stays in the baseline and
    // the conversion is a NEW migration on top of it (ADR-012, decision 1).
    const storehorse = createTableBlock(migrationSql("0_init"), "storehorse");

    expect(storehorse).toMatch(/ENGINE=MyISAM/);
  });

  it("preserves the applied HOR-79 wave exactly: users was its only conversion", () => {
    expect(executableStatements(migrationSql(USERS_ENGINE_MIGRATION))).toEqual([
      "ALTER TABLE `users` ENGINE = InnoDB",
    ]);
  });

  it("ships exactly one storehorse engine migration, ordered after HOR-142 and HOR-13 D.1", () => {
    const wave = folders.filter((name) => name.endsWith(ENGINE_MIGRATION_SUFFIX));

    expect(wave).toHaveLength(1);
    expect(wave[0] > HOR142_MIGRATION).toBe(true);
    expect(wave[0].slice(0, 14) > HOR13_D1_TIMESTAMP).toBe(true);
  });

  it("converts engines only in the HOR-79 and HOR-156 waves", () => {
    // Engine waves are explicit and separate (ADR-012, decision 3): no other
    // migration may carry an engine change as a side effect.
    const engineConversions = folders.filter((name) =>
      executableStatements(migrationSql(name)).some((statement) =>
        /^ALTER TABLE `[a-z_]+` ENGINE = InnoDB$/.test(statement),
      ),
    );

    expect(engineConversions).toEqual([
      USERS_ENGINE_MIGRATION,
      ...folders.filter((name) => name.endsWith(ENGINE_MIGRATION_SUFFIX)),
    ]);
  });

  describe("the storehorse engine migration", () => {
    let sql: string;

    beforeAll(() => {
      const folder = folders.find((name) =>
        name.endsWith(ENGINE_MIGRATION_SUFFIX),
      );
      sql = folder ? migrationSql(folder) : "";
    });

    it("executes exactly one statement: the engine change of storehorse", () => {
      expect(executableStatements(sql)).toEqual([
        "ALTER TABLE `storehorse` ENGINE = InnoDB",
      ]);
    });

    it("touches no other table, column, index, charset or constraint", () => {
      const statements = executableStatements(sql).join("\n");

      expect(statements).not.toMatch(
        /\b(DROP|DELETE|TRUNCATE|INSERT|UPDATE|MODIFY|CHANGE|ADD|RENAME|CHARSET|CHARACTER SET|COLLATE|FOREIGN KEY|CONSTRAINT|INDEX|KEY)\b/i,
      );
      for (const table of JUNCTION_TABLES) {
        expect(statements).not.toMatch(new RegExp(`\`${table}\``));
      }
    });

    it("documents what the wave deliberately leaves untouched", () => {
      // The deferrals are the decision (ADR-012): physical foreign keys stay
      // deferred, the junction tables stay MyISAM, charset is not combined.
      const header = headerOf(sql);

      expect(header).toMatch(/HOR-156/);
      expect(header).toMatch(/ADR-012/);
      expect(header).toMatch(/FOREIGN KEY/);
      expect(header).toMatch(/MyISAM/);
      expect(header).toMatch(/charset/i);
      for (const table of JUNCTION_TABLES) {
        expect(header).toMatch(new RegExp(table));
      }
    });
  });
});

describe("schema-declared storehorse model", () => {
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

  it("cannot express a storage engine, so the engine wave needs no schema change", () => {
    // PRISMA_SCHEMA_CHANGE_REQUIRED = false is structural, not a choice: the
    // DDL Prisma generates for the whole schema never names an engine, which
    // is exactly why the conversion must be a hand-written migration.
    expect(sql).toMatch(/CREATE TABLE `storehorse`/);
    expect(sql).not.toMatch(/\bENGINE\b/);
  });

  it("keeps the storehorse identity the conversion must preserve", () => {
    const storehorse = createTableBlock(sql, "storehorse");

    expect(storehorse).toMatch(/`horse_id` INTEGER NOT NULL AUTO_INCREMENT/);
    expect(storehorse).toMatch(/PRIMARY KEY \(`horse_id`\)/);
  });
});
