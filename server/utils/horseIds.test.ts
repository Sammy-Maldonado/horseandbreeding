import { describe, expect, it } from "vitest";

import { parseHorseIds } from "./horseIds";

/**
 * HOR-103 — the request grammar for a horse id, proven exhaustively.
 *
 * The defect this replaces was a one-line `idString.split(",").map(Number)`
 * with no validation at all. `Number` is not a parser: it answers `NaN` for
 * text, `Infinity` for `"Infinity"`, `0` for whitespace, `16` for `"0x10"` and
 * `1000` for `"1e3"`, and it rounds an integer too large to represent. Every
 * one of those answers used to reach Prisma.
 *
 * These tests are pure — no Prisma, no Nitro, no `hbold` — so the whole grammar
 * is decided here and the route only has to turn a rejection into a 400.
 */

/** Unwraps a result the test expects to be accepted. */
const accepted = (raw: unknown): number[] => {
  const result = parseHorseIds(raw);
  if (!result.ok) {
    throw new Error(`expected ${JSON.stringify(raw)} to be accepted`);
  }
  return result.ids;
};

describe("parseHorseIds — canonical ids the callers really send", () => {
  // The two `POST /api/horse` callers send a single route-derived id.
  it("accepts a single canonical id", () => {
    expect(accepted("1003")).toEqual([1003]);
  });

  // `pages/report.vue` sends whatever the user typed into the search box.
  it("accepts a comma-separated list, in the order given", () => {
    expect(accepted("1003,1007,1011")).toEqual([1003, 1007, 1011]);
  });

  it("preserves duplicates rather than collapsing them", () => {
    expect(accepted("1003,1003")).toEqual([1003, 1003]);
  });

  // A person typing a list types spaces after the commas. That already worked
  // and must keep working: `Number(" 1007 ")` was 1007.
  it("tolerates whitespace around each id", () => {
    expect(accepted(" 1003 , 1007 ")).toEqual([1003, 1007]);
  });

  // An id that is well-formed but matches no horse is not a syntax error. The
  // route answers it with an empty result (HOR-107), so the parser accepts it.
  it("accepts a well-formed id that no horse uses", () => {
    expect(accepted("999999999")).toEqual([999999999]);
  });

  it("accepts a real id and a missing one together", () => {
    expect(accepted("1003,999999999")).toEqual([1003, 999999999]);
  });

  it("accepts the largest safe integer", () => {
    expect(accepted(String(Number.MAX_SAFE_INTEGER))).toEqual([
      Number.MAX_SAFE_INTEGER
    ]);
  });

  // Padding is exact, not a coercion: "0001003" denotes 1003 and nothing else.
  it("accepts a zero-padded id as the number it unambiguously denotes", () => {
    expect(accepted("0001003")).toEqual([1003]);
  });
});

describe("parseHorseIds — a JSON number is the same id as its string", () => {
  /**
   * The shape HOR-103 was originally filed for: a numeric `id` reached
   * `.split` and threw `TypeError: idString.split is not a function`, which
   * the route could only answer with a 500.
   *
   * HOR-103 requires this to be decided rather than left ambiguous: a JSON
   * number is accepted when — and only when — it satisfies the same grammar a
   * string token does.
   */
  it("accepts a canonical positive integer", () => {
    expect(accepted(1003)).toEqual([1003]);
  });

  it("never throws for a numeric id", () => {
    expect(() => parseHorseIds(1003)).not.toThrow();
    expect(() => parseHorseIds(1.5)).not.toThrow();
    expect(() => parseHorseIds(Number.NaN)).not.toThrow();
  });

  it.each([
    ["a decimal", 1.5],
    ["zero", 0],
    ["a negative", -1003],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
    ["an unsafe integer", Number.MAX_SAFE_INTEGER + 2]
  ])("rejects %s", (_label, raw) => {
    expect(parseHorseIds(raw).ok).toBe(false);
  });
});

describe("parseHorseIds — malformed input is refused, never coerced", () => {
  /**
   * Family A of the defect: `Number(token)` produced `NaN`/`Infinity`, Prisma
   * could not serialise it, and the route answered 500.
   */
  it.each([
    ["plain text", "abc"],
    ["a number with a text tail", "12abc"],
    ["the literal NaN", "NaN"],
    ["the literal Infinity", "Infinity"],
    ["a valid id followed by text", "1003,abc"]
  ])("refuses %s instead of handing Prisma a broken number", (_l, raw) => {
    expect(parseHorseIds(raw).ok).toBe(false);
  });

  /**
   * Family B, and the more dangerous one: `Number` answered a number that was
   * perfectly valid and completely wrong, so the query ran against an id the
   * caller never asked for and the response looked honest.
   */
  it.each([
    ["a decimal", "1.5"],
    ["whitespace only", " "],
    ["the empty string is not a list", ","],
    ["hexadecimal", "0x10"],
    ["exponent notation", "1e3"],
    ["an explicit plus sign", "+1003"],
    ["a negative", "-1003"],
    ["zero", "0"],
    ["an integer too large to represent exactly", "9007199254740993"]
  ])("refuses %s rather than silently meaning something else", (_l, raw) => {
    expect(parseHorseIds(raw).ok).toBe(false);
  });

  // "12abc" must not become 12 — the explicit example in the issue.
  it("never keeps the numeric prefix of a mixed token", () => {
    const result = parseHorseIds("12abc");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).not.toContain("12abc");
    }
  });

  /**
   * An empty token used to become `0` and take a slot of its own, so a caller
   * asking for one id could get two results back. Refusing the whole list
   * keeps the answer's length equal to the request's.
   */
  it.each([
    ["a trailing comma", "1003,"],
    ["a leading comma", ",1003"],
    ["a doubled comma", "1003,,1007"],
    ["a comma-only list", ",,"],
    ["a whitespace-only token", "1003, ,1007"]
  ])("refuses %s rather than inventing an id 0 slot", (_l, raw) => {
    expect(parseHorseIds(raw).ok).toBe(false);
  });
});

describe("parseHorseIds — shapes that are not an id at all", () => {
  // AC 1: no id shape a caller can send may reach `.split` and throw.
  it.each([
    ["an array", ["1003"]],
    ["an object", { id: 1003 }],
    ["a boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["an empty string", ""]
  ])("refuses %s without throwing", (_label, raw) => {
    expect(() => parseHorseIds(raw)).not.toThrow();
    expect(parseHorseIds(raw).ok).toBe(false);
  });
});

describe("parseHorseIds — the rejection is safe to show a person", () => {
  /**
   * HOR-99 established that a status message is plain text and never echoes
   * what the caller sent. The reason is written once, for every rejection, so
   * no input can travel back out inside it.
   */
  it("never echoes the rejected input back to the caller", () => {
    const hostile = '<script>alert(1)</script>';
    const result = parseHorseIds(hostile);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).not.toContain(hostile);
      expect(result.reason).not.toContain("<");
    }
  });

  it("explains the rule in plain words, with no internal detail", () => {
    const result = parseHorseIds("abc");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason.length).toBeGreaterThan(0);
      expect(result.reason).not.toMatch(/prisma|storehorse|NaN|undefined/i);
    }
  });
});

describe("parseHorseIds — every accepted id is safe to query with", () => {
  /**
   * The single property the route depends on: whatever comes back is a list of
   * numbers Prisma can serialise. This is what makes "malformed input never
   * reaches the database" a fact rather than an intention.
   */
  const everyShape: unknown[] = [
    "1003",
    "1003,1007",
    " 1003 , 1007 ",
    "0001003",
    1003,
    "abc",
    "12abc",
    "1.5",
    "NaN",
    "Infinity",
    " ",
    "0x10",
    "1e3",
    "-1003",
    "0",
    "9007199254740993",
    "1003,",
    ",1003",
    "1003,,1007",
    ["1003"],
    { id: 1 },
    null,
    undefined,
    true,
    ""
  ];

  it("only ever yields canonical positive safe integers", () => {
    for (const raw of everyShape) {
      const result = parseHorseIds(raw);
      if (!result.ok) {
        continue;
      }
      for (const id of result.ids) {
        expect(typeof id).toBe("number");
        expect(Number.isSafeInteger(id)).toBe(true);
        expect(id).toBeGreaterThan(0);
      }
    }
  });

  it("accepts nothing that JSON cannot round-trip", () => {
    for (const raw of everyShape) {
      const result = parseHorseIds(raw);
      if (result.ok) {
        expect(JSON.parse(JSON.stringify(result.ids))).toEqual(result.ids);
      }
    }
  });
});
