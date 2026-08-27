import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import bcrypt from "bcrypt";
import { describe, expect, it } from "vitest";

/**
 * These tests exist for one reason: a password hash the application produces
 * must fit the column the application stores it in.
 *
 * HOR-74 — registration failed with "The provided value for the column is too
 * long for the column's type. Column: password". `prisma/schema.prisma` and the
 * versioned Prisma migration have always declared varchar(100), but the
 * reference dump `hbold` restores from still carried the legacy PHP varchar(50).
 * A 60-character bcrypt digest does not fit in 50, so every registration was
 * rejected by the database.
 *
 * The defect lived in a database artefact, which CI cannot see and must never
 * connect to. So these tests guard the two things that *are* in the repository
 * and that must stay in agreement:
 *
 *   1. bcrypt's real output length, measured rather than assumed;
 *   2. the width declared by `prisma/schema.prisma` and by the compatibility
 *      patch that reconciles `hbold` with it.
 *
 * They touch no database. They read the repository's own declarations, so they
 * fail if bcrypt starts emitting longer digests, if the schema is narrowed, or
 * if the patch and the schema drift apart.
 */

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

const read = (relativePath: string) =>
  readFileSync(`${repoRoot}${relativePath}`, "utf8");

/** The cost factor `user.put.ts` hashes with. */
const ROUTE_SALT_ROUNDS = 10;

/** Extracts one `model <name> { ... }` block so a field name cannot match another model. */
const prismaModel = (source: string, model: string) => {
  const block = source.match(
    new RegExp(`^model ${model} \\{$([\\s\\S]*?)^\\}$`, "m")
  );

  expect(block, `model ${model} is missing from prisma/schema.prisma`).not.toBe(
    null
  );

  return block![1];
};

const declaredPasswordWidth = () => {
  const field = prismaModel(read("prisma/schema.prisma"), "users").match(
    /^\s*password\s+.*@db\.VarChar\((\d+)\)/m
  );

  expect(field, "users.password must declare an explicit @db.VarChar width").not.toBe(
    null
  );

  return Number(field![1]);
};

const patchedPasswordWidth = () => {
  const statement = read(
    "db/patches/001-HOR-74-users-password-varchar100.sql"
  ).match(/MODIFY COLUMN `password` varchar\((\d+)\)/);

  expect(statement, "the HOR-74 patch must widen users.password").not.toBe(null);

  return Number(statement![1]);
};

/**
 * HOR-125 (SEC-002) — the route must never describe its write from the
 * caller's object again.
 *
 * What the contract does with each field is proven exhaustively, against the
 * real functions, in `server/utils/publicAccountWrite.test.ts`. What is left is
 * the wiring, and only the route's own source can show that: these guard the
 * two spreads that made `PUT /api/user` a mass-assignment endpoint, in the same
 * way `horse.post.test.ts` and `credential-transport.test.ts` guard theirs.
 */
const routeSource = read("server/api/user.put.ts");

/** The source with comments removed — several of them quote the defect verbatim. */
const routeCode = routeSource
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

describe("PUT /api/user — the caller no longer describes the write", () => {
  it("never spreads the caller's object into Prisma again", () => {
    // `create: { ...userData, email, password }` was the create half.
    expect(routeCode).not.toMatch(/\.\.\.\s*userData/);
  });

  it("no longer builds an update by deleting keys from the caller's object", () => {
    // `delete userData.password; delete userData.email; updateData = userData`
    // was the update half. Two keys stripped, every other one written.
    expect(routeCode).not.toMatch(/delete\s+userData\./);
    expect(routeCode).not.toMatch(/updateData\s*=\s*userData\s*;/);
  });

  it("builds both payloads through the server-owned contract", () => {
    expect(routeCode).toMatch(/toAccountCreateData\(/);
    expect(routeCode).toMatch(/toAccountUpdateData\(/);
    expect(routeSource).toMatch(
      /from\s+"\.\.\/utils\/publicAccountWrite"/
    );
  });

  it("hands the create payload the server's own email and hash", () => {
    // Not `userInfo.email`, which is the raw body value: `email` is the string
    // the handler already validated against the address regex.
    expect(routeCode).toMatch(
      /toAccountCreateData\(\s*userData\s*,\s*email\s*,\s*hashedPassword\s*\)/
    );
  });

  it("still hashes the password it stores", () => {
    // The contract owns the profile columns; it must not have displaced the
    // credential handling around it (HOR-98 keeps the rest).
    expect(routeCode).toMatch(/hashPassword\(userInfo\.password\)/);
    expect(routeCode).toMatch(/bcrypt\.compare\(/);
  });
});

describe("PUT /api/user — the fields a public caller may never set", () => {
  // A regression here would not be cosmetic: `roles` reaches
  // `user_role_scope -> scope`, the exact pair `ensureHasRoleAndScope` reads.
  it.each([
    "user_type",
    "status",
    "is_breeder",
    "is_owner",
    "is_stud",
    "welcome",
    "news",
    "logo",
    "roles",
    "refresh_tokens",
    "authorization_codes",
    "users_has_storehorse",
    "seller"
  ])("is never named in the route's write path: %s", (field) => {
    expect(routeCode).not.toMatch(new RegExp(`\\b${field}\\b`));
  });
});

describe("bcrypt digest length", () => {
  it.each([
    ["the shortest password the route accepts", "Aa1!aaaa"],
    ["a typical password", "Str0ng!Passw0rd"],
    ["a long passphrase", "correct horse battery staple 9!Aa".repeat(2)],
  ])("is 60 characters for %s", async (_label, password) => {
    const digest = await bcrypt.hash(password, ROUTE_SALT_ROUNDS);

    expect(digest).toHaveLength(60);
  });

  it("is 60 characters regardless of the cost factor", async () => {
    const cheap = await bcrypt.hash("Str0ng!Passw0rd", 4);
    const routeCost = await bcrypt.hash("Str0ng!Passw0rd", ROUTE_SALT_ROUNDS);

    expect(cheap).toHaveLength(routeCost.length);
    expect(routeCost).toHaveLength(60);
  });

  it("verifies against the password it was derived from", async () => {
    const digest = await bcrypt.hash("Str0ng!Passw0rd", ROUTE_SALT_ROUNDS);

    await expect(bcrypt.compare("Str0ng!Passw0rd", digest)).resolves.toBe(true);
    await expect(bcrypt.compare("wrong", digest)).resolves.toBe(false);
  });
});

describe("users.password storage capacity", () => {
  it("is wide enough for a bcrypt digest", async () => {
    const digest = await bcrypt.hash("Str0ng!Passw0rd", ROUTE_SALT_ROUNDS);

    expect(declaredPasswordWidth()).toBeGreaterThanOrEqual(digest.length);
  });

  it("is reconciled to the same width by the HOR-74 compatibility patch", () => {
    // If these ever disagree, a restored `hbold` no longer matches the schema
    // the application is generated from, and registration breaks again.
    expect(patchedPasswordWidth()).toBe(declaredPasswordWidth());
  });
});
