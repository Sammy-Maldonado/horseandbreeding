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

  it("folds the typographic apostrophe U+2019 to U+0027 (probe-approved, HOR-152)", () => {
    expect(horseNameKey("Silver’s Brook")).toBe(horseNameKey("Silver's Brook"));
    expect(horseNameKey("Silver’s Brook")).toBe("silver's brook");
  });

  it("folds in the comparison key only: the display form keeps U+2019 as printed", () => {
    expect(normaliseHorseName("Silver’s Brook")).toBe("Silver’s Brook");
  });

  it("keeps unapproved single-quote lookalikes distinct (measured at most one registry row each)", () => {
    expect(horseNameKey("Silver‘s Brook")).not.toBe(horseNameKey("Silver's Brook"));
    expect(horseNameKey("Silverʼs Brook")).not.toBe(horseNameKey("Silver's Brook"));
    expect(horseNameKey("Silver`s Brook")).not.toBe(horseNameKey("Silver's Brook"));
    expect(horseNameKey("Silver´s Brook")).not.toBe(horseNameKey("Silver's Brook"));
  });

  it("leaves names without U+2019 byte-identical to the pre-fold key", () => {
    expect(horseNameKey("Silver Brook (KWPN)")).toBe("silver brook (kwpn)");
    expect(horseNameKey("Silver's Brook")).toBe("silver's brook");
    expect(horseNameKey("Señorita")).toBe("señorita");
  });
});
