import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Schema and migration contract for durable identity review persistence
 * (HOR-142, ADR-018 §5 / §11).
 *
 * What these tests pin:
 *
 *   - AMBIGUOUS / CONFLICT resolutions become durable review cases anchored to
 *     the `source_assertion` evidence ledger — never a second horse registry,
 *     never a parentage table, never a copy of the raw Word text.
 *   - The idempotency key (`review_case_key`) is UNIQUE at the database level,
 *     so re-persisting the same outcome cannot duplicate a case.
 *   - Candidate snapshots are immutable decision-time evidence keyed to
 *     `storehorse.horse_id`, with a deterministic order per case.
 *   - The review lifecycle (OPEN → DECIDED) lives in dedicated nullable
 *     decision columns; recording a decision never rewrites evidence columns.
 *   - The HOR-142 migration is strictly additive and defers every FOREIGN KEY
 *     towards the MyISAM `storehorse` table, exactly like HOR-9 (ADR-012).
 *
 * Everything here reads committed files or generates SQL offline; no test
 * connects to `hbold` or any database.
 */

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const PRISMA_CLI = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url),
);
const SCHEMA_PATH = fileURLToPath(new URL("./schema.prisma", import.meta.url));
const MIGRATIONS_DIR = fileURLToPath(new URL("./migrations", import.meta.url));

/** Proves the diff never opens a connection: nothing listens on port 1. */
const UNREACHABLE_DATABASE_URL = "mysql://nobody:nothing@127.0.0.1:1/unreachable";

const MIGRATION_SUFFIX = "_hor142_identity_review_persistence";
const HOR9_MIGRATION = "20260829194803_hor9_canonical_relational_model";

const NEW_TABLES = ["identity_review_case", "identity_review_candidate"] as const;

/** The only tables the HOR-142 migration may reference with a real FOREIGN KEY. */
const INNODB_FK_TARGETS = ["source_assertion", "identity_review_case"];

/** Columns that point at `storehorse.horse_id` — declared, deferred (ADR-012). */
const STOREHORSE_LINKS: ReadonlyArray<readonly [string, string]> = [
  ["identity_review_case", "decided_horse_id"],
  ["identity_review_candidate", "horse_id"],
];

const REVIEW_OUTCOMES = ["AMBIGUOUS", "CONFLICT"];
const REVIEW_STATES = ["OPEN", "DECIDED"];
const REVIEW_DECISIONS = [
  "ASSIGNED_EXISTING_HORSE",
  "APPROVED_NEW_HORSE",
  "KEPT_TEXT_ONLY",
  "REJECTED",
];
const CANDIDATE_CLASSIFICATIONS = [
  "SUPPORTED",
  "CONFLICTED_SUPPORTED",
  "MIXED",
  "NEUTRAL",
  "CONTRADICTED",
  "EXCLUDED",
];

/** Returns the body of one `CREATE TABLE` block, without its closing clause. */
function createTableBody(sql: string, table: string): string {
  const opening = new RegExp(String.raw`^CREATE TABLE \x60${table}\x60 \(`, "m");
  const start = sql.search(opening);

  if (start === -1) throw new Error(`no CREATE TABLE for \`${table}\``);

  const rest = sql.slice(start);
  const end = rest.search(/^\)/m);

  return end === -1 ? rest : rest.slice(0, end);
}

/** Returns the whole `CREATE TABLE` statement, whitespace-normalised. */
function createTableStatement(sql: string, table: string): string {
  const opening = new RegExp(String.raw`^CREATE TABLE \x60${table}\x60 \(`, "m");
  const start = sql.search(opening);

  if (start === -1) throw new Error(`no CREATE TABLE for \`${table}\``);

  const end = sql.indexOf(";", start);

  return sql.slice(start, end).replace(/\s+/g, " ").trim();
}

/** Returns the single column definition line for `column` inside `table`. */
function columnDefinition(sql: string, table: string, column: string): string {
  const line = createTableBody(sql, table)
    .split("\n")
    .find((candidate) => candidate.trim().startsWith(`\`${column}\``));

  if (line === undefined) throw new Error(`no \`${column}\` in \`${table}\``);

  return line.trim().replace(/,$/, "");
}

/** Column names declared inside one `CREATE TABLE` body. */
function columnNames(sql: string, table: string): string[] {
  return createTableBody(sql, table)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("`"))
    .map((line) => line.slice(1, line.indexOf("`", 1)));
}

/** Values of the inline `ENUM(...)` in one column definition. */
function enumValues(definition: string): string[] {
  const match = definition.match(/ENUM\(([^)]*)\)/);

  if (!match) throw new Error(`no ENUM in: ${definition}`);

  return match[1].split(",").map((value) => value.trim().replace(/^'|'$/g, ""));
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

function allCreateTableNames(sql: string): string[] {
  return [...sql.matchAll(/^CREATE TABLE `([^`]+)`/gm)].map((match) => match[1]);
}

function generateSchemaDdl(): { status: number | null; stderr: string; stdout: string } {
  const result = spawnSync(
    process.execPath,
    [PRISMA_CLI, "migrate", "diff", "--from-empty", "--to-schema", SCHEMA_PATH, "--script"],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, DATABASE_URL: UNREACHABLE_DATABASE_URL },
    },
  );

  return { status: result.status, stderr: result.stderr ?? "", stdout: result.stdout ?? "" };
}

describe("generated schema DDL for identity review persistence", () => {
  let exitCode: number | null;
  let stderr: string;
  let sql: string;

  beforeAll(() => {
    const result = generateSchemaDdl();
    exitCode = result.status;
    stderr = result.stderr;
    sql = result.stdout;
  }, 120_000);

  it("generates without touching a database", () => {
    expect(exitCode, stderr).toBe(0);
    expect(sql).toMatch(/CREATE TABLE `storehorse`/);
  });

  it("declares both review tables", () => {
    const tables = allCreateTableNames(sql);

    for (const table of NEW_TABLES) {
      expect(tables, `missing table ${table}`).toContain(table);
    }
  });

  describe("storehorse remains the single canonical horse registry", () => {
    it("adds no table keyed by horse_id beyond the legacy baseline", () => {
      const baseline = readFileSync(join(MIGRATIONS_DIR, "0_init", "migration.sql"), "utf8");
      const keyedByHorseId = (ddl: string) =>
        allCreateTableNames(ddl).filter((table) =>
          /PRIMARY KEY \(`horse_id`\)/.test(createTableBody(ddl, table)),
        );

      expect(keyedByHorseId(baseline)).toContain("storehorse");
      expect(keyedByHorseId(sql)).toEqual(keyedByHorseId(baseline));
    });

    it("keeps pedigree out of the review tables: no sire_id, dam_id or name columns", () => {
      for (const table of NEW_TABLES) {
        const columns = columnNames(sql, table);

        expect(columns, table).not.toContain("sire_id");
        expect(columns, table).not.toContain("dam_id");
        expect(columns, table).not.toContain("name");
      }
    });

    it("declares a Prisma relation to storehorse for every horse link", () => {
      for (const [table, column] of STOREHORSE_LINKS) {
        const foreignKey = new RegExp(
          String.raw`ALTER TABLE \x60${table}\x60 ADD CONSTRAINT \x60[^\x60]+\x60 FOREIGN KEY \(\x60${column}\x60\) REFERENCES \x60storehorse\x60\s*\(\x60horse_id\x60\)`,
        );

        expect(sql, `${table}.${column}`).toMatch(foreignKey);
      }
    });
  });

  describe("identity_review_case — one durable case per assertion outcome", () => {
    it("makes the idempotency key UNIQUE at the database level", () => {
      expect(columnDefinition(sql, "identity_review_case", "review_case_key")).toMatch(
        /^`review_case_key` CHAR\(64\) NOT NULL$/,
      );
      expect(createTableBody(sql, "identity_review_case")).toMatch(
        /UNIQUE INDEX `identity_review_case_review_case_key_key`\(`review_case_key`\)/,
      );
    });

    it("requires the originating source assertion", () => {
      expect(columnDefinition(sql, "identity_review_case", "source_assertion_id")).toMatch(
        /^`source_assertion_id` INTEGER NOT NULL$/,
      );
    });

    it("restricts the outcome to the review-material vocabulary", () => {
      expect(enumValues(columnDefinition(sql, "identity_review_case", "outcome"))).toEqual(
        REVIEW_OUTCOMES,
      );
      expect(columnDefinition(sql, "identity_review_case", "outcome")).toMatch(/NOT NULL/);
    });

    it("stores the decision-time evidence snapshot without raw Word text", () => {
      expect(columnDefinition(sql, "identity_review_case", "name_key")).toMatch(
        /^`name_key` VARCHAR\(255\) NULL$/,
      );
      expect(columnDefinition(sql, "identity_review_case", "reason_codes")).toMatch(
        /JSON NOT NULL/,
      );
      expect(columnDefinition(sql, "identity_review_case", "source_conflicts")).toMatch(
        /JSON NOT NULL/,
      );
      expect(columnDefinition(sql, "identity_review_case", "establishment")).toMatch(
        /JSON NOT NULL/,
      );
      expect(columnDefinition(sql, "identity_review_case", "resolver_contract_version")).toMatch(
        /^`resolver_contract_version` VARCHAR\(31\) NOT NULL$/,
      );
      expect(columnNames(sql, "identity_review_case")).not.toContain("raw_text");
    });

    it("opens every case in the OPEN state with an empty decision", () => {
      expect(enumValues(columnDefinition(sql, "identity_review_case", "review_state"))).toEqual(
        REVIEW_STATES,
      );
      expect(columnDefinition(sql, "identity_review_case", "review_state")).toMatch(
        /NOT NULL DEFAULT 'OPEN'/,
      );
      expect(enumValues(columnDefinition(sql, "identity_review_case", "decision"))).toEqual(
        REVIEW_DECISIONS,
      );
      expect(columnDefinition(sql, "identity_review_case", "decision")).toMatch(/NULL$/);
    });

    it("carries the decision in dedicated nullable columns", () => {
      expect(columnDefinition(sql, "identity_review_case", "decided_horse_id")).toMatch(
        /^`decided_horse_id` INTEGER NULL$/,
      );
      expect(columnDefinition(sql, "identity_review_case", "decided_by")).toMatch(
        /^`decided_by` VARCHAR\(100\) NULL$/,
      );
      expect(columnDefinition(sql, "identity_review_case", "decided_at")).toMatch(
        /^`decided_at` DATETIME\(3\) NULL$/,
      );
      expect(columnDefinition(sql, "identity_review_case", "decision_note")).toMatch(
        /^`decision_note` VARCHAR\(255\) NULL$/,
      );
    });
  });

  describe("identity_review_candidate — immutable decision-time snapshots", () => {
    it("references the canonical horse and never registers one", () => {
      expect(columnDefinition(sql, "identity_review_candidate", "horse_id")).toMatch(
        /^`horse_id` INTEGER NOT NULL$/,
      );
    });

    it("orders candidates deterministically and uniquely per case", () => {
      expect(columnDefinition(sql, "identity_review_candidate", "candidate_order")).toMatch(
        /^`candidate_order` INTEGER NOT NULL$/,
      );
      expect(createTableBody(sql, "identity_review_candidate")).toMatch(
        /UNIQUE INDEX `identity_review_candidate_case_order_key`\(`identity_review_case_id`, `candidate_order`\)/,
      );
    });

    it("snapshots the evaluated evidence with the closed classification vocabulary", () => {
      expect(columnDefinition(sql, "identity_review_candidate", "candidate_name")).toMatch(
        /^`candidate_name` VARCHAR\(255\) NOT NULL$/,
      );
      expect(
        enumValues(columnDefinition(sql, "identity_review_candidate", "classification")),
      ).toEqual(CANDIDATE_CLASSIFICATIONS);
      for (const column of ["signals", "corroborations", "contradictions", "rejection_reasons"]) {
        expect(columnDefinition(sql, "identity_review_candidate", column), column).toMatch(
          /JSON NOT NULL/,
        );
      }
    });
  });
});

describe("HOR-142 migration", () => {
  const folders = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const hor142 = folders.filter((name) => name.endsWith(MIGRATION_SUFFIX));

  function migrationSql(): string {
    return readFileSync(join(MIGRATIONS_DIR, hor142[0], "migration.sql"), "utf8");
  }

  it("ships exactly one migration, ordered after the HOR-9 model it extends", () => {
    expect(hor142).toHaveLength(1);
    expect(hor142[0] > HOR9_MIGRATION).toBe(true);
  });

  it("documents the deferred storehorse foreign keys in its header", () => {
    const header = migrationSql()
      .split("\n")
      .filter((line) => line.trimStart().startsWith("--"))
      .join("\n");

    expect(header).toMatch(/storehorse/);
    expect(header).toMatch(/MyISAM/);
    expect(header).toMatch(/HOR-142/);
  });

  it("is additive: it only creates the review tables, indexes and InnoDB constraints", () => {
    const additive = new RegExp(
      String.raw`^(?:CREATE TABLE \x60(?:${NEW_TABLES.join("|")})\x60 |CREATE (?:UNIQUE )?INDEX |ALTER TABLE \x60(?:${NEW_TABLES.join("|")})\x60 ADD (?:COLUMN|CONSTRAINT) )`,
    );
    const statements = executableStatements(migrationSql());

    expect(statements.length).toBeGreaterThan(0);
    for (const statement of statements) {
      expect(statement).toMatch(additive);
      // Referential actions (`ON DELETE RESTRICT ON UPDATE CASCADE`) are part
      // of an additive FOREIGN KEY, not data statements.
      const withoutReferentialActions = statement.replace(
        /ON (?:DELETE|UPDATE) (?:RESTRICT|CASCADE|SET NULL|NO ACTION)/g,
        "",
      );
      expect(withoutReferentialActions).not.toMatch(
        /\b(?:DROP|TRUNCATE|DELETE|UPDATE|RENAME|MODIFY|CHANGE)\b/i,
      );
    }
  });

  it("never touches storehorse and never enforces a foreign key against it", () => {
    for (const statement of executableStatements(migrationSql())) {
      expect(statement).not.toMatch(/ALTER TABLE `storehorse`/);
      expect(statement).not.toMatch(/REFERENCES `storehorse`/);
    }
  });

  it("only enforces foreign keys between InnoDB tables", () => {
    const targets = [...migrationSql().matchAll(/REFERENCES `([^`]+)`/g)].map(
      (match) => match[1],
    );

    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(INNODB_FK_TARGETS, target).toContain(target);
    }
  });

  it("creates the review tables exactly as the Prisma schema generates them", () => {
    const generated = generateSchemaDdl();

    expect(generated.status, generated.stderr).toBe(0);

    const migration = migrationSql();

    for (const table of NEW_TABLES) {
      expect(createTableStatement(migration, table)).toBe(
        createTableStatement(generated.stdout, table),
      );
    }
  }, 120_000);

  it("declares utf8mb4 on both review tables", () => {
    const migration = migrationSql();

    for (const table of NEW_TABLES) {
      expect(createTableStatement(migration, table), table).toMatch(
        /DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci$/,
      );
    }
  });
});
