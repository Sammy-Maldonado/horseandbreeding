import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * These tests exist for one reason: `prisma validate` passing does NOT mean the
 * migration SQL Prisma generates is valid SQL.
 *
 * Before HOR-80 the schema carried 68 `@default(dbgenerated("..."))` declarations
 * whose payloads were corrupted literals — `()`, `(0)`, `(0000-00-00 00:00:00)`,
 * `(Farm Name)`. `dbgenerated` copies its argument verbatim into the generated
 * DDL, so `dbgenerated("()")` became `DEFAULT ()`. MariaDB rejects that with
 * `ERROR 1064` on the very first `CREATE TABLE`, yet `prisma validate` exited 0
 * the whole time because the *Prisma* syntax was well formed.
 *
 * A source-text grep for `dbgenerated` would not have caught it either: the
 * defect is not the function, it is what the function emits. So these tests
 * generate the real artifact — the migration SQL — and assert on that.
 *
 * The diff runs `--from-empty --to-schema`, which needs no database
 * connection. `DATABASE_URL` is set to a deliberately unreachable address so a
 * regression that starts requiring a live connection fails here rather than
 * silently depending on a developer's local MariaDB.
 */

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const PRISMA_CLI = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url),
);
const SCHEMA_PATH = fileURLToPath(new URL("./schema.prisma", import.meta.url));

/** Proves the diff never opens a connection: nothing listens on port 1. */
const UNREACHABLE_DATABASE_URL = "mysql://nobody:nothing@127.0.0.1:1/unreachable";

/**
 * Column default values MariaDB accepts as written. Anything else — most
 * importantly a parenthesised expression — must be justified explicitly rather
 * than reaching a migration by accident.
 */
const ACCEPTED_DEFAULT_VALUE =
  /^(?:NULL|TRUE|FALSE|CURRENT_TIMESTAMP(?:\(\d+\))?|-?\d+(?:\.\d+)?|b'[01]*')$/i;

/**
 * `@default(dbgenerated(...))` declarations allowed to remain in the schema.
 *
 * Deliberately empty. HOR-80 removed all 68. Adding an entry here is a claim
 * that the emitted SQL was executed against a real MariaDB and accepted — the
 * generated-artifact tests below are what actually enforce that claim.
 */
const ALLOWED_DBGENERATED_DEFAULTS: readonly string[] = [];

/**
 * Pulls every column default out of generated DDL.
 *
 * Quoted literals are scanned character by character rather than by regex
 * because a default such as `'a, b'` legitimately contains the delimiter that
 * would otherwise end the token. The table-level `DEFAULT CHARACTER SET` clause
 * is not a column default and is skipped.
 */
function extractColumnDefaults(sql: string): string[] {
  const defaults: string[] = [];
  const marker = /\bDEFAULT\s+/gi;
  let match: RegExpExecArray | null;

  while ((match = marker.exec(sql)) !== null) {
    const start = match.index + match[0].length;

    if (sql.startsWith("CHARACTER SET", start)) continue;

    if (sql[start] === "'") {
      let end = start + 1;
      while (end < sql.length) {
        if (sql[end] === "\\") {
          end += 2;
          continue;
        }
        if (sql[end] === "'") {
          if (sql[end + 1] === "'") {
            end += 2;
            continue;
          }
          break;
        }
        end += 1;
      }
      defaults.push(sql.slice(start, end + 1));
      marker.lastIndex = end + 1;
      continue;
    }

    const rest = sql.slice(start);
    const terminator = rest.search(/[,\n]|\s+ON\s+UPDATE\b/i);
    const value = (terminator === -1 ? rest : rest.slice(0, terminator)).trim();
    defaults.push(value);
    marker.lastIndex = start + (terminator === -1 ? rest.length : terminator);
  }

  return defaults;
}

describe("generated migration SQL", () => {
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

    exitCode = result.status;
    stderr = result.stderr ?? "";
    sql = result.stdout ?? "";
  }, 120_000);

  it("is produced by prisma migrate diff without a database connection", () => {
    expect(stderr).not.toMatch(/can't reach database|P1001/i);
    expect(exitCode).toBe(0);
  });

  it("covers every model in the schema", () => {
    const declaredModels = (
      readFileSync(SCHEMA_PATH, "utf8").match(/^model\s+\w+\s*\{/gm) ?? []
    ).length;

    expect(declaredModels).toBeGreaterThan(0);
    expect(sql.match(/CREATE TABLE/g) ?? []).toHaveLength(declaredModels);
  });

  it("contains no empty parenthesised default", () => {
    // The exact HOR-80 defect. MariaDB answers ERROR 1064 and creates nothing.
    expect(sql).not.toMatch(/DEFAULT\s+\(\s*\)/i);
  });

  it("gives every column default a value MariaDB accepts as written", () => {
    const rejected = extractColumnDefaults(sql).filter(
      (value) => !value.startsWith("'") && !ACCEPTED_DEFAULT_VALUE.test(value),
    );

    expect(rejected).toEqual([]);
  });
});

describe("prisma/schema.prisma", () => {
  it("declares no dbgenerated default outside the documented allowlist", () => {
    const declared =
      readFileSync(SCHEMA_PATH, "utf8").match(/dbgenerated\("[^"]*"\)/g) ?? [];

    const undocumented = declared.filter(
      (declaration) => !ALLOWED_DBGENERATED_DEFAULTS.includes(declaration),
    );

    expect(undocumented).toEqual([]);
  });
});
