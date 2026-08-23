import { describe, expect, it } from "vitest";

import {
  INVALID_SEARCH_OFFSET_MESSAGE,
  INVALID_SEARCH_TERM_MESSAGE,
  parseSearchQuery
} from "./searchQuery";

/**
 * HOR-116 defect B — the request grammar of `POST /api/search`.
 *
 * The route used truthiness as validation and coercion as parsing:
 *
 *   if (!body.search && !body.page) { ...400... }
 *   const data = await searchHorses(select, search, Number(page));
 *
 * `&&` let a request carrying `search` but no `page` straight through, and
 * `Number(undefined)` is `NaN`, which Prisma refuses as `skip` — so the
 * caller's mistake came back as a 500. The same coercion answered a number
 * that was valid and wrong for everything else: `0` for `null`, `""` and
 * whitespace, `1` for `true`, `0` for `[]`, and a silently rounded value for an
 * integer too large to represent. Those queried an offset the caller never
 * asked for and came back looking like an honest answer.
 *
 * The contract this module encodes was read off the only real consumer,
 * `pages/search/[texts]/[page].vue`, and confirmed against the running
 * endpoint:
 *
 *   const body = { search: searchText.value, page: (currentPage.value - 1) * 50 };
 *
 * `page` is an OFFSET, not a page number, despite its name — it is handed
 * straight to Prisma `skip`. The first page sends `0`, which is why truthiness
 * could never have been the test. `search` is genuinely optional: a request
 * with no search term browses every active horse, and `searchHorses` branches
 * on `if (name)` to do it.
 *
 * Pure by design: no Prisma, no Nitro, no database. The handler turns a
 * rejection into the caller's 400 the way HOR-96 and HOR-103 established, and
 * nothing malformed reaches the database because this answers before the first
 * query is built.
 */

describe("parseSearchQuery — the offset", () => {
  describe("values the consumer really sends", () => {
    it("accepts zero, the offset the first page sends", () => {
      // `(1 - 1) * 50`. Rejecting this is what truthiness used to do.
      expect(parseSearchQuery({ search: "ERNE", page: 0 })).toEqual({
        ok: true,
        search: "ERNE",
        offset: 0
      });
    });

    it("accepts the offsets later pages send", () => {
      for (const page of [50, 100, 150, 5000]) {
        expect(parseSearchQuery({ search: "ERNE", page })).toEqual({
          ok: true,
          search: "ERNE",
          offset: page
        });
      }
    });

    it("accepts an offset that is not a multiple of the page size", () => {
      // Offset 1 answers today. Requiring multiples of 50 would be redesigning
      // pagination, which this issue does not own.
      expect(parseSearchQuery({ search: "ERNE", page: 1 })).toEqual({
        ok: true,
        search: "ERNE",
        offset: 1
      });
    });

    it("accepts a canonical numeric string", () => {
      // `"0"` and `"50"` answer 200 today; refusing them would remove working
      // behaviour rather than fix a defect.
      expect(parseSearchQuery({ search: "ERNE", page: "0" })).toEqual({
        ok: true,
        search: "ERNE",
        offset: 0
      });
      expect(parseSearchQuery({ search: "ERNE", page: "50" })).toEqual({
        ok: true,
        search: "ERNE",
        offset: 50
      });
    });
  });

  describe("the reported defect", () => {
    it("refuses a request with no offset at all", () => {
      // This is the case HOR-108 reported: it reached Prisma as `NaN` and came
      // back a 500. It is the caller's mistake and it is a refusal here.
      expect(parseSearchQuery({ search: "ERNE" })).toEqual({
        ok: false,
        reason: INVALID_SEARCH_OFFSET_MESSAGE
      });
    });

    it("refuses an explicitly undefined offset the same way", () => {
      expect(parseSearchQuery({ search: "ERNE", page: undefined })).toEqual({
        ok: false,
        reason: INVALID_SEARCH_OFFSET_MESSAGE
      });
    });

    it("refuses an empty request rather than letting it reach the database", () => {
      expect(parseSearchQuery({})).toEqual({
        ok: false,
        reason: INVALID_SEARCH_OFFSET_MESSAGE
      });
    });
  });

  describe("values coercion used to answer a 500 for", () => {
    it.each([
      ["a word", "abc"],
      ["text with digits in it", "12abc"],
      ["a negative offset", -1],
      ["an object", {}],
      ["an overflowing literal", 1e999],
      ["Infinity", Number.POSITIVE_INFINITY],
      ["NaN", Number.NaN]
    ])("refuses %s", (_label, page) => {
      expect(parseSearchQuery({ search: "ERNE", page })).toEqual({
        ok: false,
        reason: INVALID_SEARCH_OFFSET_MESSAGE
      });
    });
  });

  describe("values coercion used to answer a wrong-but-successful 200 for", () => {
    it.each([
      ["null", null, "offset 0"],
      ["an empty string", "", "offset 0"],
      ["whitespace", " ", "offset 0"],
      ["an empty array", [], "offset 0"],
      ["true", true, "offset 1"],
      ["a decimal", 1.5, "offset 1"],
      ["an integer too large to represent exactly", 9007199254740993, "a rounded offset"]
    ])("refuses %s instead of silently answering %s", (_label, page) => {
      // Answering a different offset than the caller asked for is not a
      // successful request. Nothing here is defaulted to 0.
      expect(parseSearchQuery({ search: "ERNE", page })).toEqual({
        ok: false,
        reason: INVALID_SEARCH_OFFSET_MESSAGE
      });
    });

    it("refuses hexadecimal and exponent notation, which are not offsets", () => {
      for (const page of ["0x10", "1e3", "+50", "50.0"]) {
        expect(parseSearchQuery({ search: "ERNE", page })).toEqual({
          ok: false,
          reason: INVALID_SEARCH_OFFSET_MESSAGE
        });
      }
    });
  });

  it("accepts the largest offset that is still exact", () => {
    expect(parseSearchQuery({ page: Number.MAX_SAFE_INTEGER })).toEqual({
      ok: true,
      search: "",
      offset: Number.MAX_SAFE_INTEGER
    });
  });
});

describe("parseSearchQuery — the search term", () => {
  it("keeps the search term optional", () => {
    // `{"page":50}` browses every active horse today, and `searchHorses`
    // branches on `if (name)` to do it. Requiring a term would remove working
    // behaviour.
    expect(parseSearchQuery({ page: 50 })).toEqual({
      ok: true,
      search: "",
      offset: 50
    });
  });

  it("treats null as no search term, the way the endpoint does today", () => {
    expect(parseSearchQuery({ search: null, page: 50 })).toEqual({
      ok: true,
      search: "",
      offset: 50
    });
  });

  it("treats an empty search term as no search term", () => {
    // The `{"search":"","page":0}` 400 was an accident of `&&` with two falsy
    // values, not a contract: the same body at offset 50 answers 200 today.
    expect(parseSearchQuery({ search: "", page: 0 })).toEqual({
      ok: true,
      search: "",
      offset: 0
    });
  });

  it("passes a search term through untouched", () => {
    for (const search of ["ERNE ALERT", "  spaced  ", "o'brien", "%_"]) {
      expect(parseSearchQuery({ search, page: 0 })).toEqual({
        ok: true,
        search,
        offset: 0
      });
    }
  });

  describe("values that used to reach Prisma and become a 500", () => {
    it.each([
      ["a number", 123],
      ["an object", { a: 1 }],
      ["an array", ["ERNE"]],
      ["a boolean", true]
    ])("refuses %s as a search term", (_label, search) => {
      expect(parseSearchQuery({ search, page: 0 })).toEqual({
        ok: false,
        reason: INVALID_SEARCH_TERM_MESSAGE
      });
    });
  });
});

describe("parseSearchQuery — as a boundary", () => {
  it("never throws, whatever the caller sent", () => {
    for (const body of [null, undefined, "text", 7, [], () => 7]) {
      expect(() => parseSearchQuery(body)).not.toThrow();
      expect(parseSearchQuery(body).ok).toBe(false);
    }
  });

  it("refuses the offset before it looks at the search term", () => {
    // One refusal at a time, and the field the caller must fix first is the
    // one that used to produce the 500.
    expect(parseSearchQuery({ search: 123 })).toEqual({
      ok: false,
      reason: INVALID_SEARCH_OFFSET_MESSAGE
    });
  });

  describe("the sentences a caller is allowed to read", () => {
    it("say what to do, in plain English", () => {
      expect(INVALID_SEARCH_OFFSET_MESSAGE).toMatch(/whole number/i);
      expect(INVALID_SEARCH_TERM_MESSAGE).toMatch(/text/i);
    });

    it("name nothing internal", () => {
      // HOR-96 and HOR-99: no Prisma vocabulary, no SQL, no column names, no
      // stack traces reach the caller.
      for (const message of [
        INVALID_SEARCH_OFFSET_MESSAGE,
        INVALID_SEARCH_TERM_MESSAGE
      ]) {
        expect(message).not.toMatch(
          /prisma|sql|skip|take|storehorse|findMany|Error:|\bat\s+\//i
        );
      }
    });

    it("carry nothing the caller sent", () => {
      // The reason is written once and never built from the request, so
      // nothing a caller supplies can travel back out inside it (HOR-99).
      const injected = "<script>alert(1)</script>";
      const refused = parseSearchQuery({ search: injected, page: injected });

      expect(refused.ok).toBe(false);
      expect((refused as { reason: string }).reason).not.toContain(injected);
      expect((refused as { reason: string }).reason).toBe(
        INVALID_SEARCH_OFFSET_MESSAGE
      );
    });
  });
});
