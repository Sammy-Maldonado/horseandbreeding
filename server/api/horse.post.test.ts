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
  // Case H — a request missing a required field is still the caller's mistake.
  // HOR-107 wrote this against `!body.level || !body.id`. HOR-111 proved the
  // level half was inert and dropped it; the id half, and the 400, are the part
  // that was ever real.
  it("keeps answering a request missing a required field with 400", () => {
    expect(routeSource).toMatch(/if\s*\(!body\.id\)/);
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

/**
 * HOR-111 — `body.level` was required and then discarded.
 *
 * The parameter arrived already inert at the repository baseline import and no
 * commit in this repository ever let it reach the response. Eight distinct
 * values (`1`, `2`, `3`, `4`, `5`, `999`, `-1`, `"abc"`) were issued against the
 * running server for horse 1003 and every one produced the same 5789-byte body,
 * sha256 `f547a90509a7126b`. Only the falsy ones — absent and `0` — behaved
 * differently, and only by being refused.
 *
 * So it was dropped rather than honoured. The depth of this endpoint is the
 * depth of the horse's real maternal line, measured by `findFirstAncestor`, and
 * a caller cannot have an opinion about a fact. The four sibling endpoints that
 * build a caller-requested pedigree tree keep their `body.level`; they honour it.
 *
 * These guard the contract in both directions: the server must stop asking for
 * it, and no caller may keep sending it.
 */
describe("POST /api/horse — body.level is gone from the request contract", () => {
  it("no longer refuses a request that omits level", () => {
    expect(routeCode).not.toMatch(/!body\.level/);
  });

  it("never reads body.level anywhere in the handler", () => {
    expect(routeCode).not.toMatch(/body\.level/);
  });

  // The falsy-`0` defect cannot come back: the value is not consulted at all.
  it("cannot refuse level 0 for being falsy, because it does not look", () => {
    expect(routeCode).not.toMatch(/body\s*\[\s*["'`]level["'`]\s*\]/);
  });

  // HOR-111 owns `level` only. A request with no id is still the caller's 400,
  // with the same message it has always had.
  it("still refuses a request with no id, unchanged", () => {
    expect(routeCode).toMatch(/if\s*\(!body\.id\)/);
    expect(routeSource).toMatch(/statusCode:\s*400/);
    expect(routeSource).toMatch(/message:\s*"Error the data define"/);
  });
});

describe("POST /api/horse — the depth stays the server's to derive", () => {
  it("still measures the real maternal line rather than trusting the caller", () => {
    expect(routeCode).toMatch(/findFirstAncestor\(ids\[i\]\)/);
  });

  // The property that actually bounds the recursion: nothing from the request
  // body reaches the walker or the builder. HOR-107's 0..4 domain is safe only
  // while this holds.
  it("lets no request value reach the walker or the select builder", () => {
    expect(routeCode).not.toMatch(/findFirstAncestor\([^)]*body/);
    expect(routeCode).not.toMatch(/buildSelect\([^)]*body/);
    expect(routeCode).toMatch(/buildSelect\(level,\s*level\)/);
  });

  it("still validates the derived depth before building a select with it", () => {
    const guard = routeCode.indexOf("isValidPedigreeLevel(level)");
    const build = routeCode.indexOf("buildSelect(level, level)");

    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(build);
  });
});

/**
 * The other half of the contract. Removing a required parameter from a server
 * while its callers keep sending it leaves the two disagreeing, which is the
 * defect this issue exists to end — so the callers are asserted here too.
 *
 * Both pages also call `POST /api/familyHorseStore`, which reads
 * `Number(body.level)` and genuinely honours it. That call keeps its level, and
 * these tests prove HOR-111 did not reach across into it.
 */
const callers = [
  ["pages/PremiumHorseDetail/[id].vue", "../../pages/PremiumHorseDetail/[id].vue"],
  ["pages/premium-horse-detail1/[id].vue", "../../pages/premium-horse-detail1/[id].vue"]
] as const;

describe.each(callers)("%s — the caller agrees with the server", (_label, relative) => {
  const source = readFileSync(
    fileURLToPath(new URL(relative, import.meta.url)),
    "utf8"
  );

  /** The body literal of the call to a given endpoint, as written in the page. */
  const bodyFor = (endpoint: string): string => {
    const at = source.indexOf(`"${endpoint}"`);
    expect(at).toBeGreaterThan(-1);
    const from = source.indexOf("JSON.stringify({", at);
    expect(from).toBeGreaterThan(-1);
    return source.slice(from, source.indexOf("}", from) + 1);
  };

  it("no longer sends level to /api/horse", () => {
    expect(bodyFor("/api/horse")).not.toMatch(/\blevel\b/);
  });

  it("still sends the route-derived id to /api/horse", () => {
    expect(bodyFor("/api/horse")).toMatch(/id:\s*id\.toString\(\)/);
  });

  // The endpoint that really uses a level is untouched by this issue.
  it("still sends level to /api/familyHorseStore, which honours it", () => {
    expect(bodyFor("/api/familyHorseStore")).toMatch(/level:\s*2/);
  });
});
