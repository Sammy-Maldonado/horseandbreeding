import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * HOR-116 defect B — guards on the wiring of `POST /api/search` that the pure
 * tests in `server/utils/searchQuery.test.ts` cannot see.
 *
 * The grammar itself is proven there, against the real parser. What is left is
 * the route: the offset must be decided *before* Prisma is asked for anything,
 * the truthiness guard must be gone rather than inverted, and a genuine
 * internal failure must still be a bare 500.
 *
 * These read the route's own source, the one thing CI can always inspect
 * without a database, the same way `horse.post.test.ts` does for HOR-103.
 */

const routeSource = readFileSync(
  fileURLToPath(new URL("./search.post.ts", import.meta.url)),
  "utf8"
);

/**
 * The source with its comments removed. The comment above the guard quotes the
 * defect so the next reader knows what went wrong, and it must not be mistaken
 * for the defect itself.
 */
const routeCode = routeSource
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

describe("POST /api/search — the offset is decided before Prisma sees it", () => {
  it("parses the request with the shared grammar", () => {
    expect(routeSource).toMatch(
      /import\s*\{\s*parseSearchQuery\s*\}\s*from\s*"\.\.\/utils\/searchQuery"/
    );
    expect(routeCode).toMatch(/parseSearchQuery\(\s*body\s*\)/);
  });

  it("refuses a malformed request before it builds a query", () => {
    const parse = routeCode.indexOf("parseSearchQuery(body)");
    const query = routeCode.indexOf("searchHorses(");

    expect(parse).toBeGreaterThan(-1);
    expect(query).toBeGreaterThan(parse);
  });

  it("hands the caller the reason the parser refused, not one of its own", () => {
    expect(routeCode).toMatch(/message:\s*parsed\.reason/);
  });

  it("no longer coerces the offset on its way to the database", () => {
    // `Number` is a coercion, not a parser — the HOR-103 root cause. The value
    // reaching `skip` is the one the parser already validated.
    expect(routeCode).not.toMatch(/Number\s*\(\s*page\s*\)/);
  });

  it("no longer uses truthiness as validation", () => {
    // Neither the original `&&` nor an inverted `||`: zero is a legitimate
    // offset, so no truthiness test on `page` can ever be correct here.
    expect(routeCode).not.toMatch(/!\s*body\s*\.\s*page/);
    expect(routeCode).not.toMatch(/!\s*body\s*\.\s*search/);
  });
});

describe("POST /api/search — HTTP semantics", () => {
  it("answers a caller's malformed request with 400", () => {
    expect(routeCode).toMatch(/statusCode:\s*400/);
    expect(routeCode).toMatch(/statusMessage:\s*"Bad Request"/);
  });

  it("still answers an unexpected server failure with a bare 500", () => {
    // HOR-96: our failure stays ours, and the body says nothing more.
    expect(routeCode).toMatch(/statusCode:\s*500/);
    expect(routeCode).toMatch(/message:\s*"Internal Server Error"/);
  });

  it("still lets a raised HTTP error travel unchanged", () => {
    expect(routeCode).toMatch(/if\s*\(isError\(error\)\)\s*\{\s*throw error;/);
  });

  it("does not catch a database error and relabel it as the caller's", () => {
    // Prisma failures are not turned into 400s after the fact; the request is
    // refused before the query, or the failure is honestly a 500.
    expect(routeCode).not.toMatch(/Prisma\w*Error/);
  });
});

describe("POST /api/search — behaviour this issue must not change", () => {
  it("keeps the search term optional in the query it builds", () => {
    // `{"page":50}` browses every active horse today.
    expect(routeCode).toMatch(/if\s*\(name\)\s*\{/);
  });

  it("keeps returning the same successful envelope", () => {
    expect(routeCode).toMatch(/status:\s*200/);
    expect(routeCode).toMatch(/body:\s*JSON\.stringify\(data\)/);
  });

  it("keeps the page size and the ordering it already had", () => {
    expect(routeCode).toMatch(/take:\s*50/);
    expect(routeCode).toMatch(/orderBy:\s*\{\s*name:\s*"asc"\s*\}/);
  });

  it("keeps only active horses in scope", () => {
    expect(routeCode).toMatch(/activeHorseFilter\(\)/);
  });

  it("still releases the connection whatever happened", () => {
    expect(routeCode).toMatch(/finally\s*\{\s*await prisma\.\$disconnect\(\)/);
  });
});
