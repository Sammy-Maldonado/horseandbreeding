import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Schema and migration contract for the canonical relational model around
 * `storehorse` (HOR-9, ADR-018 / ADR-005 / ADR-017).
 *
 * What these tests pin:
 *
 *   - `storehorse` stays the ONLY horse registry. Every new table is anchored
 *     to `storehorse.horse_id`; none of them declares a registry shape.
 *   - A mare has at most one canonical write-up: `canonical_writeup.horse_id`
 *     is UNIQUE at the database level, not only in application code.
 *   - The zero-loss persistence vocabulary is a closed database enum.
 *   - `competition_history` evolves additively: every legacy column survives
 *     and every new column is nullable.
 *   - The HOR-9 migration is additive and backwards compatible: it creates,
 *     adds and indexes; it never drops, renames, modifies, updates or deletes.
 *   - Foreign keys towards the MyISAM `storehorse` table are declared in the
 *     Prisma schema but deferred in the migration, exactly like the existing
 *     `competition_history` relation (ADR-012 deferral list).
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

const MIGRATION_SUFFIX = "_hor9_canonical_relational_model";

const NEW_TABLES = [
  "canonical_writeup",
  "source_document",
  "ingestion_run",
  "source_assertion",
  "canonical_change_audit",
] as const;

/** The only tables the HOR-9 migration may reference with a real FOREIGN KEY. */
const INNODB_FK_TARGETS = [...NEW_TABLES, "competition_history"];

/** Columns that point at `storehorse.horse_id` from the new tables. */
const STOREHORSE_LINKS: ReadonlyArray<readonly [string, string]> = [
  ["canonical_writeup", "horse_id"],
  ["source_assertion", "horse_id"],
  ["source_assertion", "related_horse_id"],
  ["canonical_change_audit", "horse_id"],
];

const ZERO_LOSS_STATES = [
  "CANONICALISED_STRUCTURED",
  "CANONICALISED_RELATIONSHIP",
  "PRESERVED_SOURCE_FACT",
  "AMBIGUOUS",
  "CONFLICT",
  "EXPLICITLY_UNSUPPORTED",
  "ERROR",
];

const RESOLUTION_OUTCOMES = [
  "NOT_ATTEMPTED",
  "EXISTING_HORSE",
  "NEW_HORSE",
  "AMBIGUOUS",
  "CONFLICT",
];

/** Every column `competition_history` had before HOR-9 (0_init + HOR-79). */
const COMPETITION_HISTORY_LEGACY_COLUMNS = [
  "competition_history_id",
  "horse_name",
  "storehorse_id",
  "rider",
  "competition_year",
  "location",
  "csi",
  "type",
  "height",
  "placed_in_competition",
  "detail",
  "status",
  "created",
];

/** Structured, nullable columns HOR-9 adds to `competition_history`. */
const COMPETITION_HISTORY_NEW_COLUMNS = [
  "discipline_code",
  "result_kind",
  "event_name",
  "level_code",
  "participation",
  "country_code",
  "raw_source_segment",
  "ingestion_run_id",
  "canonicalisation_state",
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

describe("generated schema DDL for the canonical relational model", () => {
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

  it("declares every table of the canonical relational model", () => {
    const tables = allCreateTableNames(sql);

    for (const table of NEW_TABLES) {
      expect(tables, `missing table ${table}`).toContain(table);
    }
  });

  describe("storehorse remains the single canonical horse registry", () => {
    it("adds no table keyed by horse_id beyond the legacy baseline", () => {
      // `storehorse_new` is a legacy 0_init table, not a registry created here.
      // The guard is that HOR-9 adds NOTHING with a horse_id primary key.
      const baseline = readFileSync(join(MIGRATIONS_DIR, "0_init", "migration.sql"), "utf8");
      const keyedByHorseId = (ddl: string) =>
        allCreateTableNames(ddl).filter((table) =>
          /PRIMARY KEY \(`horse_id`\)/.test(createTableBody(ddl, table)),
        );

      expect(keyedByHorseId(baseline)).toContain("storehorse");
      expect(keyedByHorseId(sql)).toEqual(keyedByHorseId(baseline));
    });

    it("never gains a registry look-alike table", () => {
      const lookAlike = allCreateTableNames(sql).filter((table) =>
        /^(?:horse|horses|canonical_horse|horse_canonical|imported_horse|source_horse)$/.test(
          table,
        ),
      );

      expect(lookAlike).toEqual([]);
    });

    it("keeps pedigree out of the new tables: no sire_id, dam_id or name columns", () => {
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

  describe("canonical_writeup — one write-up per mare (ADR-005)", () => {
    it("requires a horse_id and makes it UNIQUE at the database level", () => {
      expect(columnDefinition(sql, "canonical_writeup", "horse_id")).toMatch(
        /^`horse_id` INTEGER NOT NULL$/,
      );
      expect(createTableBody(sql, "canonical_writeup")).toMatch(
        /UNIQUE INDEX `canonical_writeup_horse_id_key`\(`horse_id`\)/,
      );
    });

    it("stores content, a content hash, a lifecycle state and a version", () => {
      expect(columnDefinition(sql, "canonical_writeup", "content")).toMatch(/TEXT NOT NULL/);
      expect(columnDefinition(sql, "canonical_writeup", "content_hash")).toMatch(
        /CHAR\(64\) NOT NULL/,
      );
      expect(enumValues(columnDefinition(sql, "canonical_writeup", "lifecycle_state"))).toEqual([
        "IMPORTED",
        "APPROVED",
        "CORRECTED",
      ]);
      expect(columnDefinition(sql, "canonical_writeup", "version")).toMatch(
        /INTEGER NOT NULL DEFAULT 1/,
      );
    });

    it("carries its provenance origin as nullable links to document and run", () => {
      expect(columnDefinition(sql, "canonical_writeup", "source_document_id")).toMatch(
        /INTEGER NULL/,
      );
      expect(columnDefinition(sql, "canonical_writeup", "ingestion_run_id")).toMatch(
        /INTEGER NULL/,
      );
    });
  });

  describe("source_document — never a binary, always a stable key", () => {
    it("has a unique document key and a unique content fingerprint", () => {
      const body = createTableBody(sql, "source_document");

      expect(body).toMatch(/UNIQUE INDEX `source_document_document_key_key`\(`document_key`\)/);
      expect(body).toMatch(
        /UNIQUE INDEX `source_document_content_fingerprint_key`\(`content_fingerprint`\)/,
      );
      expect(columnDefinition(sql, "source_document", "content_fingerprint")).toMatch(
        /CHAR\(64\) NOT NULL/,
      );
    });

    it("stores no document binary", () => {
      expect(createTableBody(sql, "source_document")).not.toMatch(/BLOB/i);
    });
  });

  describe("ingestion_run — deterministic and accountable", () => {
    it("has a unique run key, versions, status and accounting", () => {
      expect(createTableBody(sql, "ingestion_run")).toMatch(
        /UNIQUE INDEX `ingestion_run_run_key_key`\(`run_key`\)/,
      );
      expect(columnDefinition(sql, "ingestion_run", "extractor_version")).toMatch(/NOT NULL/);
      expect(columnDefinition(sql, "ingestion_run", "output_contract_version")).toMatch(
        /NOT NULL/,
      );
      expect(enumValues(columnDefinition(sql, "ingestion_run", "run_status"))).toEqual([
        "STARTED",
        "COMPLETED",
        "FAILED",
        "ABORTED",
      ]);
      expect(columnDefinition(sql, "ingestion_run", "accounting_summary")).toMatch(/JSON NULL/);
    });
  });

  describe("source_assertion — the zero-loss evidence ledger", () => {
    it("uses the closed zero-loss state vocabulary", () => {
      expect(
        enumValues(columnDefinition(sql, "source_assertion", "persistence_state")),
      ).toEqual(ZERO_LOSS_STATES);
    });

    it("records the identity resolution outcome without ever forcing a horse", () => {
      expect(
        enumValues(columnDefinition(sql, "source_assertion", "resolution_outcome")),
      ).toEqual(RESOLUTION_OUTCOMES);
      expect(columnDefinition(sql, "source_assertion", "horse_id")).toMatch(
        /^`horse_id` INTEGER NULL$/,
      );
      expect(columnDefinition(sql, "source_assertion", "related_horse_id")).toMatch(
        /^`related_horse_id` INTEGER NULL$/,
      );
    });

    it("links many assertions to one canonical fact through typed nullable pointers", () => {
      expect(columnDefinition(sql, "source_assertion", "writeup_id")).toMatch(/INTEGER NULL/);
      expect(columnDefinition(sql, "source_assertion", "competition_history_id")).toMatch(
        /INTEGER NULL/,
      );
    });

    it("keeps raw content, coordinates and a deterministic assertion key", () => {
      expect(columnDefinition(sql, "source_assertion", "raw_text")).toMatch(/TEXT NOT NULL/);
      expect(columnDefinition(sql, "source_assertion", "interpreted_payload")).toMatch(
        /JSON NULL/,
      );
      expect(columnDefinition(sql, "source_assertion", "node_id")).toMatch(/NOT NULL/);
      expect(columnDefinition(sql, "source_assertion", "block_index")).toMatch(
        /INTEGER NOT NULL/,
      );
      expect(createTableBody(sql, "source_assertion")).toMatch(
        /UNIQUE INDEX `source_assertion_assertion_key_key`\(`assertion_key`\)/,
      );
    });
  });

  describe("canonical_change_audit — every canonical change is reversible by run", () => {
    it("records target, previous and new value, decision and run", () => {
      const columns = columnNames(sql, "canonical_change_audit");

      for (const column of [
        "ingestion_run_id",
        "source_assertion_id",
        "horse_id",
        "target_kind",
        "target_id",
        "field_name",
        "previous_value",
        "new_value",
        "change_kind",
        "decided_by",
        "created_at",
      ]) {
        expect(columns).toContain(column);
      }
      expect(enumValues(columnDefinition(sql, "canonical_change_audit", "change_kind"))).toEqual([
        "CREATED",
        "UPDATED",
        "CONFIRMED",
        "REVERTED",
      ]);
    });
  });

  describe("competition_history — additive evolution only", () => {
    it("keeps every legacy column", () => {
      const columns = columnNames(sql, "competition_history");

      for (const column of COMPETITION_HISTORY_LEGACY_COLUMNS) {
        expect(columns, column).toContain(column);
      }
    });

    it("adds only nullable structured columns", () => {
      for (const column of COMPETITION_HISTORY_NEW_COLUMNS) {
        expect(columnDefinition(sql, "competition_history", column), column).toMatch(
          /\bNULL$/,
        );
      }
    });

    it("types the result kind from the extractor's placing vocabulary", () => {
      expect(enumValues(columnDefinition(sql, "competition_history", "result_kind"))).toEqual([
        "PLACED",
        "WON",
        "COMPETED",
      ]);
      expect(enumValues(columnDefinition(sql, "competition_history", "participation"))).toEqual([
        "INDIVIDUAL",
        "TEAM",
      ]);
      expect(
        enumValues(columnDefinition(sql, "competition_history", "canonicalisation_state")),
      ).toEqual(ZERO_LOSS_STATES);
    });

    it("still relates each result to the horse that achieved it", () => {
      expect(columnDefinition(sql, "competition_history", "storehorse_id")).toMatch(
        /^`storehorse_id` INTEGER NULL$/,
      );
    });
  });
});

describe("HOR-9 migration", () => {
  const folders = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const hor9 = folders.filter((name) => name.endsWith(MIGRATION_SUFFIX));

  function migrationSql(): string {
    return readFileSync(join(MIGRATIONS_DIR, hor9[0], "migration.sql"), "utf8");
  }

  it("ships exactly one migration, ordered after every migration applied before it", () => {
    expect(hor9).toHaveLength(1);
    // Later issues (HOR-142, ...) append after HOR-9; ordering is pinned to
    // the last migration that predates the canonical model.
    expect(hor9[0] > "20260819120000_storehorse_status_active_backfill").toBe(true);
  });

  it("documents the deferred storehorse foreign keys in its header", () => {
    const header = migrationSql()
      .split("\n")
      .filter((line) => line.trimStart().startsWith("--"))
      .join("\n");

    expect(header).toMatch(/storehorse/);
    expect(header).toMatch(/MyISAM/);
    expect(header).toMatch(/HOR-9/);
  });

  it("is additive: it only creates tables, adds columns, indexes and InnoDB constraints", () => {
    const additive = new RegExp(
      String.raw`^(?:CREATE TABLE \x60(?:${NEW_TABLES.join("|")})\x60 |CREATE (?:UNIQUE )?INDEX |ALTER TABLE \x60(?:${INNODB_FK_TARGETS.join("|")})\x60 ADD (?:COLUMN|CONSTRAINT) )`,
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

  it("creates the new tables exactly as the Prisma schema generates them", () => {
    const generated = generateSchemaDdl();

    expect(generated.status, generated.stderr).toBe(0);

    const migration = migrationSql();

    for (const table of NEW_TABLES) {
      expect(createTableStatement(migration, table)).toBe(
        createTableStatement(generated.stdout, table),
      );
    }
  }, 120_000);

  it("adds every structured competition_history column as nullable", () => {
    const alter = executableStatements(migrationSql()).filter((statement) =>
      statement.startsWith("ALTER TABLE `competition_history` ADD COLUMN"),
    );

    expect(alter.length).toBeGreaterThan(0);

    const joined = alter.join(" ");
    for (const column of COMPETITION_HISTORY_NEW_COLUMNS) {
      // A column definition ends at the next top-level comma; the commas
      // inside ENUM('A', 'B') belong to the type, not to the column list.
      expect(joined, column).toMatch(
        new RegExp(String.raw`ADD COLUMN \x60${column}\x60 (?:\([^)]*\)|[^,;(])*\bNULL\b`),
      );
    }
    for (const column of COMPETITION_HISTORY_LEGACY_COLUMNS) {
      expect(joined, column).not.toMatch(new RegExp(String.raw`ADD COLUMN \x60${column}\x60`));
    }
  });

  it("declares utf8mb4 on every new text column of the latin1 competition_history table", () => {
    // competition_history is a latin1 legacy table. A raw Word segment holds
    // curly quotes, dashes and accented names that latin1 cannot store; a
    // latin1 column would reject or mangle them — silent loss by charset.
    const joined = executableStatements(migrationSql())
      .filter((statement) =>
        statement.startsWith("ALTER TABLE `competition_history` ADD COLUMN"),
      )
      .join(" ");

    for (const column of [
      "discipline_code",
      "event_name",
      "level_code",
      "country_code",
      "raw_source_segment",
    ]) {
      expect(joined, column).toMatch(
        new RegExp(
          String.raw`ADD COLUMN \x60${column}\x60 (?:VARCHAR\(\d+\)|TEXT) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL`,
        ),
      );
    }
  });
});
