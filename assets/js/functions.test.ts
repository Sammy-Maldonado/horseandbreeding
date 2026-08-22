import { describe, expect, it } from "vitest";

// @ts-expect-error — functions.js is untyped JavaScript shared by the pages.
import { parseRouteId } from "./functions.js";

/**
 * `parseRouteId` replaces `decryptNumber`, which turned an AES-obfuscated route
 * segment back into an integer. Horse and breeder identifiers now travel as
 * plain decimal numbers (`/pedigree/erne-alert/1003`), so the only remaining
 * responsibility is validation: a route parameter is caller-controlled input
 * and must never reach an API query unchecked (CLAUDE.md §7).
 *
 * The invalid sentinel stays `-1`, exactly what `decryptNumber` returned when
 * decryption failed. Every consuming page already treats it as "no such horse",
 * so the observable contract of a broken URL is unchanged.
 */
describe("parseRouteId", () => {
  it("accepts a canonical positive decimal identifier", () => {
    expect(parseRouteId("1003")).toBe(1003);
  });

  it("accepts a number, so a caller that already holds an integer is not punished", () => {
    expect(parseRouteId(1003)).toBe(1003);
  });

  it("rejects an identifier that is missing entirely", () => {
    expect(parseRouteId(undefined)).toBe(-1);
    expect(parseRouteId(null)).toBe(-1);
    expect(parseRouteId("")).toBe(-1);
  });

  it("rejects non-numeric text", () => {
    expect(parseRouteId("erne-alert")).toBe(-1);
    // The old `parseInt` semantics would have returned 12 here.
    expect(parseRouteId("12abc")).toBe(-1);
  });

  it("rejects surrounding whitespace", () => {
    expect(parseRouteId(" 12")).toBe(-1);
    expect(parseRouteId("12 ")).toBe(-1);
  });

  it("rejects signs, decimals and exponent notation", () => {
    expect(parseRouteId("+12")).toBe(-1);
    expect(parseRouteId("-12")).toBe(-1);
    expect(parseRouteId("1.5")).toBe(-1);
    expect(parseRouteId("1e3")).toBe(-1);
    expect(parseRouteId("0x1f")).toBe(-1);
  });

  it("rejects zero and non-canonical leading zeros", () => {
    // Identifiers are positive; producers emit `String(id)`, never "007".
    expect(parseRouteId("0")).toBe(-1);
    expect(parseRouteId("007")).toBe(-1);
  });

  it("rejects an identifier beyond safe integer precision", () => {
    expect(parseRouteId("9007199254740993")).toBe(-1);
  });

  it("rejects a repeated route parameter delivered as an array", () => {
    expect(parseRouteId(["1003"])).toBe(-1);
  });
});
