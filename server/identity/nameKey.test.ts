import { describe, expect, it } from "vitest";

import { horseNameKey, normaliseHorseName } from "./nameKey";

describe("normaliseHorseName", () => {
  it("trims and collapses internal whitespace, nothing else", () => {
    expect(normaliseHorseName("  Silver \t\n  Brook  ")).toBe("Silver Brook");
    expect(normaliseHorseName("Silver Brook")).toBe("Silver Brook");
  });

  it("keeps case, diacritics, punctuation and studbook suffixes exactly as printed", () => {
    expect(normaliseHorseName("SILVER Brook")).toBe("SILVER Brook");
    expect(normaliseHorseName("Señorita Brook")).toBe("Señorita Brook");
    expect(normaliseHorseName("Silver-Brook Z")).toBe("Silver-Brook Z");
    expect(normaliseHorseName("Silver Brook (KWPN)")).toBe("Silver Brook (KWPN)");
    expect(normaliseHorseName("Silver’s Brook")).toBe("Silver’s Brook");
  });

  it("maps null, undefined and blank input to the empty string", () => {
    expect(normaliseHorseName(null)).toBe("");
    expect(normaliseHorseName(undefined)).toBe("");
    expect(normaliseHorseName("   ")).toBe("");
  });
});

describe("horseNameKey", () => {
  it("is the normalised name compared case-insensitively", () => {
    expect(horseNameKey("  SILVER   brook ")).toBe("silver brook");
    expect(horseNameKey("Silver Brook")).toBe(horseNameKey("silver brook"));
  });

  it("returns null for a name that carries no usable text", () => {
    expect(horseNameKey(null)).toBeNull();
    expect(horseNameKey("")).toBeNull();
    expect(horseNameKey(" \t ")).toBeNull();
  });

  it("does not equate studbook-suffix, punctuation or token variants (measured net-negative)", () => {
    expect(horseNameKey("Silver Brook Z")).not.toBe(horseNameKey("Silver Brook"));
    expect(horseNameKey("Silver Brook (KWPN)")).not.toBe(horseNameKey("Silver Brook"));
    expect(horseNameKey("Silver-Brook")).not.toBe(horseNameKey("Silver Brook"));
    expect(horseNameKey("Silverbrook")).not.toBe(horseNameKey("Silver Brook"));
    expect(horseNameKey("Silver Brook v.d. Hill")).not.toBe(horseNameKey("Silver Brook van de Hill"));
  });

  it("does not fold diacritics: comparison is case-insensitive, accent-sensitive", () => {
    expect(horseNameKey("Señorita")).not.toBe(horseNameKey("Senorita"));
  });

  it("v1 limitation: typographic and ASCII apostrophes stay distinct until a probe approves the fold", () => {
    expect(horseNameKey("Silver’s Brook")).not.toBe(horseNameKey("Silver's Brook"));
  });
});
