import { describe, expect, it } from "vitest";

import {
  RELATIONSHIP_ASSERTION_KINDS,
  derivePersistenceState,
  summariseAccounting,
  validateAssertionLinks,
} from "./persistenceState";
import { INGESTION_PERSISTENCE_STATES, SOURCE_ASSERTION_KINDS } from "./types";

describe("derivePersistenceState", () => {
  it.each([
    ["ERROR", "ERROR"],
    ["EXPLICITLY_UNSUPPORTED", "EXPLICITLY_UNSUPPORTED"],
    ["EXPLICITLY_AMBIGUOUS", "AMBIGUOUS"],
    ["PRESERVED_UNPARSED", "PRESERVED_SOURCE_FACT"],
  ] as const)("maps extractor status %s to %s regardless of resolution", (status, state) => {
    for (const resolutionOutcome of ["NOT_ATTEMPTED", "EXISTING_HORSE", "AMBIGUOUS"] as const) {
      expect(
        derivePersistenceState({
          accountingStatus: status,
          assertionKind: "FREE_TEXT",
          resolutionOutcome,
        }),
      ).toBe(state);
    }
  });

  it("keeps a PARSED item as a preserved source fact until identity is resolved", () => {
    // HOR-14 owns resolution. Until then nothing is canonicalised — and
    // nothing is lost either.
    expect(
      derivePersistenceState({
        accountingStatus: "PARSED",
        assertionKind: "BIRTH_YEAR",
        resolutionOutcome: "NOT_ATTEMPTED",
      }),
    ).toBe("PRESERVED_SOURCE_FACT");
  });

  it.each(["EXISTING_HORSE", "NEW_HORSE"] as const)(
    "canonicalises a PARSED, %s-resolved item as structured or relationship by kind",
    (resolutionOutcome) => {
      for (const assertionKind of SOURCE_ASSERTION_KINDS) {
        if (assertionKind === "UNSUPPORTED_STRUCTURE" || assertionKind === "EXTRACTION_ERROR") {
          continue;
        }
        const expected = RELATIONSHIP_ASSERTION_KINDS.includes(assertionKind)
          ? "CANONICALISED_RELATIONSHIP"
          : "CANONICALISED_STRUCTURED";

        expect(
          derivePersistenceState({ accountingStatus: "PARSED", assertionKind, resolutionOutcome }),
          assertionKind,
        ).toBe(expected);
      }
    },
  );

  it("surfaces an ambiguous or conflicting identity as its own state, never as a fact", () => {
    expect(
      derivePersistenceState({
        accountingStatus: "PARSED",
        assertionKind: "SUBJECT_IDENTITY",
        resolutionOutcome: "AMBIGUOUS",
      }),
    ).toBe("AMBIGUOUS");
    expect(
      derivePersistenceState({
        accountingStatus: "PARSED",
        assertionKind: "PEDIGREE_DAM",
        resolutionOutcome: "CONFLICT",
      }),
    ).toBe("CONFLICT");
  });

  it("lets the assertion kind override a PARSED status for unsupported and error kinds", () => {
    expect(
      derivePersistenceState({
        accountingStatus: "PARSED",
        assertionKind: "UNSUPPORTED_STRUCTURE",
        resolutionOutcome: "EXISTING_HORSE",
      }),
    ).toBe("EXPLICITLY_UNSUPPORTED");
    expect(
      derivePersistenceState({
        accountingStatus: "PARSED",
        assertionKind: "EXTRACTION_ERROR",
        resolutionOutcome: "EXISTING_HORSE",
      }),
    ).toBe("ERROR");
  });

  it("names the pedigree and link kinds as relationships", () => {
    expect([...RELATIONSHIP_ASSERTION_KINDS]).toEqual([
      "PEDIGREE_DAM",
      "PEDIGREE_SIRE",
      "DESCENDANT_LINK",
      "APPROVAL",
      "STUDBOOK",
      "DISCIPLINE",
      "SEE_ABOVE_REFERENCE",
    ]);
  });
});

describe("summariseAccounting", () => {
  it("counts every state and reports zero unaccounted when all items are present", () => {
    const summary = summariseAccounting({
      totalSourceItems: 5,
      states: [
        "CANONICALISED_STRUCTURED",
        "PRESERVED_SOURCE_FACT",
        "PRESERVED_SOURCE_FACT",
        "AMBIGUOUS",
        "ERROR",
      ],
    });

    expect(summary).toEqual({
      totalSourceItems: 5,
      accounted: 5,
      unaccounted: 0,
      complete: true,
      counts: {
        CANONICALISED_STRUCTURED: 1,
        CANONICALISED_RELATIONSHIP: 0,
        PRESERVED_SOURCE_FACT: 2,
        AMBIGUOUS: 1,
        CONFLICT: 0,
        EXPLICITLY_UNSUPPORTED: 0,
        ERROR: 1,
      },
    });
    expect(Object.keys(summary.counts)).toEqual([...INGESTION_PERSISTENCE_STATES]);
  });

  it("is incomplete when items are missing, and reports how many", () => {
    const summary = summariseAccounting({
      totalSourceItems: 3,
      states: ["CANONICALISED_STRUCTURED"],
    });

    expect(summary).toMatchObject({ accounted: 1, unaccounted: 2, complete: false });
  });

  it("is incomplete when more items were accounted than the source holds", () => {
    // A duplicate is as much a loss of truth as an omission.
    const summary = summariseAccounting({
      totalSourceItems: 1,
      states: ["PRESERVED_SOURCE_FACT", "PRESERVED_SOURCE_FACT"],
    });

    expect(summary).toMatchObject({ accounted: 2, unaccounted: -1, complete: false });
  });

  it("treats an empty document as complete", () => {
    expect(summariseAccounting({ totalSourceItems: 0, states: [] })).toMatchObject({
      accounted: 0,
      unaccounted: 0,
      complete: true,
    });
  });
});

describe("validateAssertionLinks", () => {
  it("accepts a resolved assertion carrying the canonical horse", () => {
    expect(
      validateAssertionLinks({
        persistenceState: "CANONICALISED_STRUCTURED",
        resolutionOutcome: "EXISTING_HORSE",
        horseId: 1003,
      }),
    ).toEqual({ ok: true });
  });

  it("accepts an unresolved assertion with no horse at all", () => {
    expect(
      validateAssertionLinks({
        persistenceState: "PRESERVED_SOURCE_FACT",
        resolutionOutcome: "NOT_ATTEMPTED",
        horseId: null,
      }),
    ).toEqual({ ok: true });
  });

  it("refuses to attach a horse to an AMBIGUOUS resolution: never auto-assigned", () => {
    expect(
      validateAssertionLinks({
        persistenceState: "AMBIGUOUS",
        resolutionOutcome: "AMBIGUOUS",
        horseId: 1003,
      }),
    ).toEqual({ ok: false, reason: "AMBIGUOUS_MUST_NOT_ASSIGN_HORSE" });
  });

  it("refuses a horse on a NOT_ATTEMPTED resolution: a horse id is a decision, not a default", () => {
    expect(
      validateAssertionLinks({
        persistenceState: "PRESERVED_SOURCE_FACT",
        resolutionOutcome: "NOT_ATTEMPTED",
        horseId: 1003,
      }),
    ).toEqual({ ok: false, reason: "UNRESOLVED_MUST_NOT_ASSIGN_HORSE" });
  });

  it.each(["EXISTING_HORSE", "NEW_HORSE"] as const)(
    "requires a horse id once the resolution is %s",
    (resolutionOutcome) => {
      expect(
        validateAssertionLinks({
          persistenceState: "CANONICALISED_STRUCTURED",
          resolutionOutcome,
          horseId: null,
        }),
      ).toEqual({ ok: false, reason: "RESOLVED_REQUIRES_HORSE" });
    },
  );

  it("refuses a canonicalised state without a horse: nothing canonical floats free", () => {
    expect(
      validateAssertionLinks({
        persistenceState: "CANONICALISED_RELATIONSHIP",
        resolutionOutcome: "NOT_ATTEMPTED",
        horseId: null,
      }),
    ).toEqual({ ok: false, reason: "CANONICALISED_REQUIRES_HORSE" });
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects %s as a horse id", (horseId) => {
    expect(
      validateAssertionLinks({
        persistenceState: "CANONICALISED_STRUCTURED",
        resolutionOutcome: "EXISTING_HORSE",
        horseId,
      }),
    ).toEqual({ ok: false, reason: "INVALID_HORSE_ID" });
  });
});
