import { describe, expect, it } from "vitest";

import { classifyCandidate, evaluateCandidate } from "./evaluate";
import { buildStorehorseIndex } from "./storehorseIndex";
import type { SourceHorseEntity, SourceParentAssertion, StorehorseRow } from "./types";

function row(overrides: Partial<StorehorseRow> & { horseId: number }): StorehorseRow {
  return { name: "", birthYear: 0, sireId: 0, damId: 0, sex: "UNKNOWN", ...overrides };
}

function entity(overrides: Partial<SourceHorseEntity> = {}): SourceHorseEntity {
  return {
    sourceId: "s1",
    provenance: { documentId: "doc-1", nodeId: "n1" },
    name: "Silver Brook",
    birthYear: null,
    sex: "UNKNOWN",
    sire: null,
    dam: null,
    maternalGranddam: null,
    structuralRole: "LOT_SUBJECT",
    occurrenceCount: 1,
    ...overrides,
  };
}

const confident = (name: string): SourceParentAssertion => ({ name, confidence: "CONFIDENT" });

const MARE = row({ horseId: 100, name: "Silver Brook", birthYear: 2005, damId: 200, sireId: 300, sex: "MARE" });
const DAM = row({ horseId: 200, name: "Brook Lady", birthYear: 1998, damId: 400 });
const SIRE = row({ horseId: 300, name: "Argent", birthYear: 1990 });
const GRANDDAM = row({ horseId: 400, name: "Old Lady", birthYear: 1985 });
const index = buildStorehorseIndex([MARE, DAM, SIRE, GRANDDAM]);

describe("classifyCandidate", () => {
  it.each([
    [0, 0, "NEUTRAL"],
    [1, 0, "SUPPORTED"],
    [3, 0, "SUPPORTED"],
    [2, 1, "CONFLICTED_SUPPORTED"],
    [3, 2, "CONFLICTED_SUPPORTED"],
    [1, 1, "MIXED"],
    [2, 2, "MIXED"],
    [1, 2, "MIXED"],
    [0, 1, "CONTRADICTED"],
    [0, 2, "EXCLUDED"],
    [0, 3, "EXCLUDED"],
  ] as const)("%i corroborations / %i contradictions → %s", (corr, contra, expected) => {
    const signals = ["DAM", "SIRE", "BIRTH_YEAR", "MATERNAL_GRANDDAM", "SEX"] as const;
    expect(classifyCandidate(signals.slice(0, corr), signals.slice(5 - contra))).toBe(expected);
  });
});

describe("evaluateCandidate", () => {
  it("reports every signal in the contract order, whatever its state", () => {
    const evaluation = evaluateCandidate(entity(), MARE, index);

    expect(evaluation.signals.map((s) => s.signal)).toEqual([
      "DAM",
      "MATERNAL_GRANDDAM",
      "SIRE",
      "BIRTH_YEAR",
      "SEX",
    ]);
    expect(evaluation).toMatchObject({
      horseId: 100,
      name: "Silver Brook",
      classification: "NEUTRAL",
      corroborations: [],
      contradictions: [],
      rejectionReasons: [],
    });
  });

  it("corroborates through dam, maternal granddam, sire and birth year, walking the registry chain", () => {
    const evaluation = evaluateCandidate(
      entity({
        dam: confident("brook lady"),
        maternalGranddam: confident("OLD LADY"),
        sire: confident("Argent"),
        birthYear: 2005,
      }),
      MARE,
      index,
    );

    expect(evaluation.corroborations).toEqual(["DAM", "MATERNAL_GRANDDAM", "SIRE", "BIRTH_YEAR"]);
    expect(evaluation.classification).toBe("SUPPORTED");
  });

  it("does not count a sex match as corroboration but does count a sex mismatch as contradiction", () => {
    expect(evaluateCandidate(entity({ sex: "MARE" }), MARE, index)).toMatchObject({
      corroborations: [],
      contradictions: [],
      classification: "NEUTRAL",
    });
    expect(evaluateCandidate(entity({ sex: "STALLION" }), MARE, index)).toMatchObject({
      corroborations: [],
      contradictions: ["SEX"],
      classification: "CONTRADICTED",
      rejectionReasons: ["TRUSTED_SIGNAL_MISMATCH"],
    });
  });

  it("names the kind of trusted contradiction, once per kind", () => {
    const evaluation = evaluateCandidate(
      entity({ dam: confident("Other Lady"), sire: confident("Other Sire"), birthYear: 2001 }),
      MARE,
      index,
    );

    expect(evaluation.contradictions).toEqual(["DAM", "SIRE", "BIRTH_YEAR"]);
    expect(evaluation.rejectionReasons).toEqual(["TRUSTED_PARENT_MISMATCH", "TRUSTED_SIGNAL_MISMATCH"]);
    expect(evaluation.classification).toBe("EXCLUDED");
  });

  it("keeps an ambiguous source relation out of both lists and says why", () => {
    const evaluation = evaluateCandidate(
      entity({ dam: { name: "Brook Lady", confidence: "AMBIGUOUS" } }),
      MARE,
      index,
    );

    expect(evaluation.corroborations).toEqual([]);
    expect(evaluation.signals[0]).toMatchObject({
      signal: "DAM",
      state: "UNKNOWN",
      note: "SOURCE_RELATION_AMBIGUOUS",
    });
  });

  it("treats a registry parent that is unnamed or missing as unknown, not as agreement", () => {
    const orphan = row({ horseId: 101, name: "Silver Brook", damId: 999 });
    const evaluation = evaluateCandidate(entity({ dam: confident("Brook Lady") }), orphan, index);

    expect(evaluation.signals[0]).toMatchObject({ state: "UNKNOWN", candidateValue: null });
    expect(evaluation.classification).toBe("NEUTRAL");
  });
});
