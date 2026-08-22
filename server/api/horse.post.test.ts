import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * HOR-107 — guards on the wiring of `POST /api/horse` that the pure tests in
 * `server/utils/pedigreeSelect.test.ts` cannot see.
 *
 * The recursion itself is proven to terminate there, against the real builder.
 * What is left is the route: the depth a missing horse produces must never
 * reach that builder, and a request missing a required field must still be the
 * caller's 400 rather than the server's 500 (HOR-96).
 *
 * These read the route's own source, the one thing CI can always inspect
 * without a database, in the same way `credential-transport.test.ts` does.
 */

const routeSource = readFileSync(
  fileURLToPath(new URL("./horse.post.ts", import.meta.url)),
  "utf8"
);

/**
 * The source with its comments removed. The comment above `if (!storeHorse)`
 * quotes the defect verbatim so the next reader knows what went wrong, and it
 * must not be mistaken for the defect itself.
 */
const routeCode = routeSource
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

describe("POST /api/horse — a missing horse never becomes a depth", () => {
  it("no longer decrements the walker's level to invent one", () => {
    expect(routeCode).not.toMatch(/--\s*level/);
  });

  it("reports absence as absence", () => {
    expect(routeSource).toMatch(/if\s*\(!storeHorse\)\s*\{\s*return null;/);
  });

  // Case C — the guard has to sit between the walker and the builder, not after.
  it("validates the depth before building a select with it", () => {
    const guard = routeSource.indexOf("isValidPedigreeLevel(level)");
    const build = routeSource.indexOf("buildSelect(level, level)");

    expect(guard).toBeGreaterThan(-1);
    expect(build).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(build);
  });
});

describe("POST /api/horse — HTTP semantics", () => {
  // Case H — a request missing `id` or `level` is still the caller's mistake.
  it("keeps answering a request missing a required field with 400", () => {
    expect(routeSource).toMatch(/if\s*\(!body\.level\s*\|\|\s*!body\.id\)/);
    expect(routeSource).toMatch(/statusCode:\s*400/);
  });

  it("still answers an unexpected server failure with a bare 500", () => {
    expect(routeSource).toMatch(/statusCode:\s*500/);
    expect(routeSource).toMatch(/message:\s*"Internal Server Error"/);
  });
});

/**
 * HOR-103 — the route must decide the id before Prisma ever sees it.
 *
 * The pure grammar is proven in `server/utils/horseIds.test.ts`. What is left
 * here is the wiring: that the route uses that parser, that it refuses a bad
 * id with the caller's 400 rather than the server's 500, and — the property
 * the defect was really about — that nothing malformed can reach the database
 * because the guard sits before the first Prisma call in the handler.
 */
describe("POST /api/horse — a malformed id never reaches Prisma", () => {
  it("parses the id with the shared parser instead of a private helper", () => {
    expect(routeCode).toMatch(/parseHorseIds\s*\(\s*body\.id\s*\)/);
    expect(routeCode).not.toMatch(/function\s+convertToArray/);
    expect(routeCode).not.toMatch(/\.split\(","\)\.map/);
  });

  it("imports the parser from the shared util rather than redefining it", () => {
    expect(routeSource).toMatch(
      /import\s*\{[^}]*parseHorseIds[^}]*\}\s*from\s*"\.\.\/utils\/horseIds"/
    );
  });

  // Case A — the guard has to sit between the parser and the first query.
  it("rejects the request before the first Prisma call", () => {
    const parse = routeCode.indexOf("parseHorseIds(body.id)");
    const guard = routeCode.indexOf("parsed.ok");
    // `findFirstAncestor` is *declared* above the handler, so its declaration
    // is not the thing to measure against. The call the loop makes is the
    // first point an id can reach Prisma, and that is what the guard precedes.
    const firstIdReachesPrisma = routeCode.indexOf("findFirstAncestor(ids[i])");

    expect(parse).toBeGreaterThan(-1);
    expect(firstIdReachesPrisma).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(parse);
    expect(guard).toBeLessThan(firstIdReachesPrisma);
  });

  // The ids the loop queries with are the parser's output and nothing else.
  it("queries only with ids the parser accepted", () => {
    expect(routeCode).toMatch(/const\s+ids\s*=\s*parsed\.ids/);
    expect(routeCode).not.toMatch(/ids\s*=\s*body\.id/);
  });

  it("answers a malformed id with 400, not 500", () => {
    expect(routeCode).toMatch(/statusCode:\s*400[\s\S]*?parsed\.reason/);
  });

  it("never puts the caller's input into the message it sends back", () => {
    expect(routeCode).not.toMatch(/message:\s*[`"'].*\$\{[^}]*body\.id/);
  });
});

describe("POST /api/horse — HOR-111 stays untouched", () => {
  /**
   * `body.level` is required and then ignored. That is BUG-008 and it belongs
   * to HOR-111. This issue must not remove the requirement, start honouring
   * the value, or otherwise move the level contract.
   */
  it("still requires body.level", () => {
    expect(routeSource).toMatch(/if\s*\(!body\.level\s*\|\|\s*!body\.id\)/);
  });

  it("still derives the depth from the maternal line, not from the caller", () => {
    expect(routeCode).toMatch(/findFirstAncestor\(ids\[i\]\)/);
    expect(routeCode).not.toMatch(/Number\(body\.level\)/);
  });
});
