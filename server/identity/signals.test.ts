import { describe, expect, it } from "vitest";

import {
  USABLE_BIRTH_YEAR_MAX,
  USABLE_BIRTH_YEAR_MIN,
  compareBirthYear,
  compareParentName,
  compareSex,
  usableBirthYear,
} from "./signals";
import type { SourceParentAssertion, StorehorseRow } from "./types";

function row(overrides: Partial<StorehorseRow> & { horseId: number }): StorehorseRow {
  return { name: "", birthYear: 0, sireId: 0, damId: 0, sex: "UNKNOWN", ...overrides };
}

const confident = (name: string): SourceParentAssertion => ({ name, confidence: "CONFIDENT" });

describe("usableBirthYear (interim screen pending HOR-144)", () => {
  it("accepts an integer inside the interim plausibility range", () => {
    expect(usableBirthYear(USABLE_BIRTH_YEAR_MIN)).toBe(1900);
    expect(usableBirthYear(2005)).toBe(2005);
    expect(usableBirthYear(USABLE_BIRTH_YEAR_MAX)).toBe(2030);
  });

  it("treats the storehorse sentinel 0, null and undefined as unknown", () => {
    expect(usableBirthYear(0)).toBeNull();
    expect(usableBirthYear(null)).toBeNull();
    expect(usableBirthYear(undefined)).toBeNull();
  });

  it("treats junk values as unknown instead of evidence", () => {
    expect(usableBirthYear(6)).toBeNull();
    expect(usableBirthYear(1899)).toBeNull();
    expect(usableBirthYear(2031)).toBeNull();
    expect(usableBirthYear(4554)).toBeNull();
    expect(usableBirthYear(2005.5)).toBeNull();
    expect(usableBirthYear(Number.NaN)).toBeNull();
  });
});

describe("compareBirthYear", () => {
  it("matches only when both sides are usable and equal", () => {
    expect(compareBirthYear(2005, 2005)).toEqual({
      signal: "BIRTH_YEAR",
      state: "MATCH",
      sourceValue: "2005",
      candidateValue: "2005",
    });
  });

  it("contradicts when both sides are usable and differ", () => {
    expect(compareBirthYear(2005, 2006)).toMatchObject({ state: "MISMATCH" });
  });

  it("is UNKNOWN when either side is missing or junk — equal junk is not a match", () => {
    expect(compareBirthYear(null, 2005)).toMatchObject({ state: "UNKNOWN", sourceValue: null });
    expect(compareBirthYear(2005, 0)).toMatchObject({ state: "UNKNOWN", candidateValue: null });
    expect(compareBirthYear(0, 0)).toMatchObject({ state: "UNKNOWN" });
    expect(compareBirthYear(4554, 4554)).toMatchObject({ state: "UNKNOWN" });
  });
});

describe("compareSex", () => {
  it("is UNKNOWN whenever either side is unknown", () => {
    expect(compareSex("UNKNOWN", "MARE")).toMatchObject({ signal: "SEX", state: "UNKNOWN" });
    expect(compareSex("MARE", "UNKNOWN")).toMatchObject({ state: "UNKNOWN" });
    expect(compareSex("UNKNOWN", "UNKNOWN")).toMatchObject({ state: "UNKNOWN" });
  });

  it("matches equal known sexes and contradicts different ones", () => {
    expect(compareSex("MARE", "MARE")).toMatchObject({ state: "MATCH" });
    expect(compareSex("MARE", "STALLION")).toMatchObject({ state: "MISMATCH" });
  });
});

describe("compareParentName", () => {
  const registeredDam = row({ horseId: 20, name: "Brook   Lady" });

  it("matches a confident source parent against the registered parent by comparison key", () => {
    expect(compareParentName("DAM", confident("  brook lady "), registeredDam)).toEqual({
      signal: "DAM",
      state: "MATCH",
      sourceValue: "brook lady",
      candidateValue: "Brook Lady",
    });
  });

  it("contradicts when both names are known and differ", () => {
    expect(compareParentName("DAM", confident("Other Lady"), registeredDam)).toMatchObject({
      state: "MISMATCH",
      sourceValue: "Other Lady",
      candidateValue: "Brook Lady",
    });
  });

  it("is UNKNOWN when the source says nothing or the registry has no parent", () => {
    expect(compareParentName("SIRE", null, registeredDam)).toMatchObject({
      state: "UNKNOWN",
      sourceValue: null,
    });
    expect(compareParentName("DAM", confident("Brook Lady"), undefined)).toMatchObject({
      state: "UNKNOWN",
      candidateValue: null,
    });
    expect(compareParentName("DAM", confident("   "), registeredDam)).toMatchObject({
      state: "UNKNOWN",
    });
    expect(
      compareParentName("DAM", confident("Brook Lady"), row({ horseId: 21, name: " " })),
    ).toMatchObject({ state: "UNKNOWN", candidateValue: null });
  });

  it("never turns an ambiguous, unsupported or error relation into evidence — even when the names agree", () => {
    for (const confidence of ["AMBIGUOUS", "UNSUPPORTED", "ERROR"] as const) {
      expect(
        compareParentName("DAM", { name: "Brook Lady", confidence }, registeredDam),
      ).toMatchObject({ state: "UNKNOWN", note: "SOURCE_RELATION_AMBIGUOUS" });
    }
  });

  it("does not strip punctuation or studbook suffixes to force agreement", () => {
    expect(
      compareParentName("DAM", confident("Brook Lady Z"), registeredDam),
    ).toMatchObject({ state: "MISMATCH" });
    expect(
      compareParentName("DAM", confident("Brook-Lady"), registeredDam),
    ).toMatchObject({ state: "MISMATCH" });
  });
});
