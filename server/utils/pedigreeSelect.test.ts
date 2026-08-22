import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  buildSelect,
  isValidPedigreeLevel,
  MAX_PEDIGREE_LEVEL as MAX_LEVEL,
  MIN_PEDIGREE_LEVEL as MIN_LEVEL
} from "./pedigreeSelect";

/**
 * HOR-107 — `POST /api/horse` answered 500 for any horse id that does not
 * resolve to an active `storehorse` row.
 *
 * The cause was not in the route's error handling. `findFirstAncestor` reports
 * the depth of a horse's maternal line, and for a horse it cannot find it ran
 * `return --level;` from its initial `level = 0`, so it returned **-1**. That
 * -1 was then handed to `buildSelect(-1, -1)`, whose only base case was the
 * exact test `level === 0`. A negative level skips that test forever:
 *
 *     buildSelect(-1, -1)  level === 0? no   level === topLevel? yes -> dam: buildSelect(-2, -1)
 *     buildSelect(-2, -1)  level === 0? no   level === topLevel? no  -> dam: buildSelect(-3, -1)
 *     buildSelect(-3, -1)  ...
 *
 * `level` decreases monotonically and can never return to 0 nor equal
 * `topLevel` again, so there is no reachable base case:
 * `RangeError: Maximum call stack size exceeded`.
 *
 * `buildSelect` is pure — it builds a plain object and touches no database —
 * so these tests exercise the real function, not a description of it.
 */

/** How deep the maternal chain may legitimately go (`findFirstAncestor` stops here). */
const MAX_LEGITIMATE_LEVEL = MAX_LEVEL;

/**
 * Follows the `dam` chain the builder generates and returns its length.
 *
 * The root node carries `dam` directly; every nested node carries it under
 * `select`. Walking stops at the first node with no `dam` of its own. The cap
 * exists so a builder that produced a cyclic or absurdly deep object fails the
 * test instead of hanging it.
 */
const damChainDepth = (node: any, cap = 64): number => {
  let depth = 0;
  let current = node;

  while (current) {
    const next = current.dam ?? current.select?.dam;
    if (!next) {
      return depth;
    }
    depth += 1;
    if (depth > cap) {
      throw new Error(`dam chain exceeded ${cap} levels`);
    }
    current = next;
  }

  return depth;
};

const shape = (level: number, topLevel: number) =>
  createHash("sha256")
    .update(JSON.stringify(buildSelect(level, topLevel)))
    .digest("hex")
    .slice(0, 16);

describe("buildSelect — termination", () => {
  // Case A — the exact failure that was reproduced against a running build.
  it("returns instead of exhausting the stack for the level -1 that a missing horse produced", () => {
    expect(() => buildSelect(-1, -1)).not.toThrow();
  });

  // Case G — no internally invalid depth may start an unbounded descent.
  it.each([
    ["equal negative levels", -1, -1],
    ["deeper negative levels", -7, -7],
    ["negative level under a valid top level", -1, MAX_LEGITIMATE_LEVEL],
    ["negative level under a zero top level", -3, 0],
    ["mismatched negatives", -2, -9],
    ["a far negative level", -1000, -1000],
    ["a non-numeric level", Number.NaN, Number.NaN],
    ["a non-numeric level under a valid top level", Number.NaN, MAX_LEGITIMATE_LEVEL]
  ])("terminates for %s", (_label, level, topLevel) => {
    const select = buildSelect(level, topLevel);

    expect(select).toBeTypeOf("object");
    expect(damChainDepth(select)).toBeLessThanOrEqual(MAX_LEGITIMATE_LEVEL);
  });
});

describe("buildSelect — the shape a valid pedigree still has", () => {
  // Case E — the minimum valid depth: a horse with no active dam at all.
  it("builds a flat root with no maternal chain at level 0", () => {
    const select = buildSelect(0, 0);

    expect(select.horse_id).toBe(true);
    expect(select.name).toBe(true);
    expect(select.select).toBeUndefined();
    expect(select.dam).toBeUndefined();
    expect(damChainDepth(select)).toBe(0);
  });

  // Cases B, D and F — every depth `findFirstAncestor` can legitimately report.
  // Level 2 is ERNE ALERT (horse 1003); level 4 is the deepest line the walker
  // will follow; levels 1 and 3 are the incomplete lines in between.
  it.each([1, 2, 3, MAX_LEGITIMATE_LEVEL])(
    "nests exactly %i maternal generations under an unwrapped root",
    (level) => {
      const select = buildSelect(level, level);

      // The root feeds a `findMany({ select })`, so it must not be wrapped.
      expect(select.select).toBeUndefined();
      expect(select.dam).toBeDefined();
      expect(damChainDepth(select)).toBe(level);
    }
  );

  /**
   * The fix must bound the recursion without changing what a valid request
   * returns. These digests were taken from the builder before the fix, so a
   * change to any selected field on any legitimate depth fails here.
   */
  it.each([
    [0, 0, "1923cce6c4ecd540"],
    [1, 1, "a595e62882044f91"],
    [2, 2, "f2171fd840a967a7"],
    [3, 3, "655b2af18eff2944"],
    [4, 4, "c212f2d4a5985890"]
  ])("still selects exactly the same fields at level %i", (level, topLevel, digest) => {
    expect(shape(level, topLevel)).toBe(digest);
  });
});

describe("isValidPedigreeLevel — the gate between the walker and the builder", () => {
  // Case C — a horse that is missing, or filtered out as inactive, has no
  // depth. `findFirstAncestor` now says so by returning null, and null must
  // never be mistaken for a level.
  it.each([
    ["the absence a missing horse reports", null],
    ["an unfinished lookup", undefined],
    ["the -1 the old `return --level` produced", -1],
    ["any deeper negative", -4],
    ["a depth past the walker's ceiling", MAX_LEVEL + 1],
    ["a fractional depth", 1.5],
    ["a non-number", "2"],
    ["a non-number that coerces", Number.NaN]
  ])("rejects %s", (_label, level) => {
    expect(isValidPedigreeLevel(level)).toBe(false);
  });

  // Cases E and F — every depth the walker can legitimately reach is accepted.
  it.each([MIN_LEVEL, 1, 2, 3, MAX_LEVEL])("accepts the real depth %i", (level) => {
    expect(isValidPedigreeLevel(level)).toBe(true);
  });

  it("agrees with the range buildSelect can terminate on", () => {
    expect(MIN_LEVEL).toBe(0);
    expect(MAX_LEVEL).toBe(4);
  });
});
