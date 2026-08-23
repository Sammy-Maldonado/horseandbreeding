import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * HOR-119 — Defect B: the route page arrives as a string.
 *
 * `/search/:texts/:page` hands `route.params.page` to the page component as a
 * URL segment, which is always a string. The page stored it unchanged:
 *
 *     const currentPage = ref(route.params.page || 0);
 *
 * Every consumer that subtracts survives, because `-` coerces both operands
 * numerically — the API offset `(currentPage - 1) * 50` and the Previous link
 * are correct purely by accident. The one consumer that *adds* does not:
 * `page + 1` concatenates, so `"2" + 1` is `"21"`.
 *
 * The fix belongs here, at the boundary where the URL stops being a URL, not in
 * scattered casts inside the pagination component. `type: Number` in
 * `defineProps` cannot save it either — a prop type is a runtime *check*, not a
 * conversion; only `Boolean` props are coerced.
 *
 * These tests run the page's own declarations rather than a copy, so the
 * boundary they describe is the real one. They also pin the offsets that
 * invalid route pages produce today, so that fixing the arithmetic does not
 * quietly change what `/search/erne/abc` or `/search/erne/0` do.
 *
 * No database, no network, no Nuxt runtime.
 */

const PAGE_FILE = join(dirname(fileURLToPath(import.meta.url)), "[page].vue");

function sourceLine(startsWith: string): string {
  const source = readFileSync(PAGE_FILE, "utf8");

  const line = source
    .split("\n")
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate.startsWith(startsWith));

  if (!line) {
    throw new Error(`"${startsWith}" not found in [page].vue`);
  }

  return line.replace(/\s*\/\/.*$/, "").trim();
}

/** The expression the page wraps in `ref(...)` to build `currentPage`. */
function currentPageExpression(): string {
  return sourceLine("const currentPage = ref(")
    .replace(/^const currentPage = ref\(/, "")
    .replace(/\);$/, "");
}

/** The expression the page sends to `POST /api/search` as its offset. */
function searchOffsetExpression(): string {
  return sourceLine("page: (currentPage.value")
    .replace(/^page:\s*/, "")
    .replace(/,$/, "");
}

/** What `currentPage` holds when the router matched this URL segment. */
function currentPageFor(segment: string): unknown {
  const read = new Function(
    "route",
    `"use strict"; return (${currentPageExpression()});`,
  ) as (route: { params: Record<string, string> }) => unknown;

  return read({ params: { page: segment, texts: "erne" } });
}

/** The offset that reaches the search endpoint for this URL segment. */
function searchOffsetFor(segment: string): unknown {
  const read = new Function(
    "currentPage",
    `"use strict"; return (${searchOffsetExpression()});`,
  ) as (currentPage: { value: unknown }) => unknown;

  return read({ value: currentPageFor(segment) });
}

describe("search route — the page number the URL carries", () => {
  it("reaches the page component as a number, not as a URL string", () => {
    for (const segment of ["1", "2", "9", "10", "20"]) {
      expect(typeof currentPageFor(segment)).toBe("number");
      expect(currentPageFor(segment)).toBe(Number(segment));
    }
  });

  it("increments when one is added to it instead of concatenating", () => {
    // This is the defect stated at the boundary: `"1" + 1` is `"11"`.
    expect((currentPageFor("1") as number) + 1).toBe(2);
    expect((currentPageFor("2") as number) + 1).toBe(3);
    expect((currentPageFor("9") as number) + 1).toBe(10);
    expect((currentPageFor("10") as number) + 1).toBe(11);
  });

  it("still decrements correctly, as it already did", () => {
    expect((currentPageFor("1") as number) - 1).toBe(0);
    expect((currentPageFor("10") as number) - 1).toBe(9);
  });
});

describe("search route — the API offset derived from the page number", () => {
  it("stays (page - 1) * 50 for every valid page", () => {
    // The UI route page and the API offset are different concepts. Route page
    // N asks the endpoint for offset (N - 1) * 50, and that must not move.
    expect(searchOffsetFor("1")).toBe(0);
    expect(searchOffsetFor("2")).toBe(50);
    expect(searchOffsetFor("9")).toBe(400);
    expect(searchOffsetFor("10")).toBe(450);
    expect(searchOffsetFor("20")).toBe(950);
  });

  it("keeps producing exactly the offset an invalid page produces today", () => {
    // Fixing the arithmetic must not change what a malformed or out-of-range
    // URL does. Each of these already renders the search page with an empty
    // result list, and it keeps doing so.
    expect(searchOffsetFor("abc")).toBeNaN();
    expect(searchOffsetFor("0")).toBe(-50);
    expect(searchOffsetFor("-1")).toBe(-100);
    expect(searchOffsetFor("1.5")).toBe(25);
    expect(searchOffsetFor("999999")).toBe(49999900);
  });
});
