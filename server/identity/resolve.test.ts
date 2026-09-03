import { describe, expect, it } from "vitest";

import { assessEstablishment, resolveSourceEntities, resolveSourceEntity } from "./resolve";
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

/** Synthetic registry — every name and number is invented. */
const REGISTRY: StorehorseRow[] = [
  // A sole candidate with a full family chain.
  row({ horseId: 100, name: "Silver Brook", birthYear: 2005, damId: 200, sireId: 300, sex: "MARE" }),
  row({ horseId: 200, name: "Brook Lady", birthYear: 1998, damId: 400 }),
  row({ horseId: 300, name: "Argent", birthYear: 1990 }),
  row({ horseId: 400, name: "Old Lady", birthYear: 1985 }),
  // Same name, separable by dam.
  row({ horseId: 110, name: "Twin Mare", birthYear: 2001, damId: 210 }),
  row({ horseId: 111, name: "Twin Mare", birthYear: 2001, damId: 211 }),
  row({ horseId: 210, name: "Twin Dam A" }),
  row({ horseId: 211, name: "Twin Dam B" }),
  // A sole candidate with no data at all.
  row({ horseId: 120, name: "Ghost Mare" }),
  // Irreducible duplicates without data.
  row({ horseId: 130, name: "Dup Mare" }),
  row({ horseId: 131, name: "Dup Mare" }),
  // A sole candidate whose registered dam is stale.
  row({ horseId: 140, name: "Stale Mare", birthYear: 2003, damId: 240, sireId: 340 }),
  row({ horseId: 240, name: "Wrong Dam" }),
  row({ horseId: 340, name: "Right Sire" }),
  // Junk birth year on the registry side.
  row({ horseId: 150, name: "Future Mare", birthYear: 2087 }),
  // Full siblings: same name, same year, same parents.
  row({ horseId: 160, name: "Full Sib", birthYear: 2002, damId: 260, sireId: 360 }),
  row({ horseId: 161, name: "Full Sib", birthYear: 2002, damId: 260, sireId: 360 }),
  row({ horseId: 260, name: "Sib Dam" }),
  row({ horseId: 360, name: "Sib Sire" }),
  // A stale-dam candidate next to a data-free namesake.
  row({ horseId: 170, name: "Shadow Mare", birthYear: 2003, damId: 270, sireId: 370 }),
  row({ horseId: 171, name: "Shadow Mare" }),
  row({ horseId: 270, name: "Shadow Wrong Dam" }),
  row({ horseId: 370, name: "Shadow Sire" }),
  // ASCII-apostrophe rows reachable from typographic spellings (HOR-152).
  row({ horseId: 180, name: "Keeper's Mare", birthYear: 2004, damId: 280 }),
  row({ horseId: 280, name: "Keeper Dam" }),
  row({ horseId: 185, name: "Equiv Filly", damId: 285 }),
  row({ horseId: 285, name: "Mother's Pride" }),
  // Namesakes that only meet once apostrophes are folded.
  row({ horseId: 190, name: "Pair's Mare" }),
  row({ horseId: 191, name: "Pair’s Mare" }),
];
const index = buildStorehorseIndex(REGISTRY);

describe("assessEstablishment", () => {
  it("establishes a structured entity with at least one identity anchor", () => {
    expect(assessEstablishment(entity({ dam: confident("Any Dam") }))).toEqual({
      structuralRole: "LOT_SUBJECT",
      anchors: ["RELIABLE_DAM"],
      wellEstablished: true,
    });
    expect(assessEstablishment(entity({ structuralRole: "DESCENDANT_RECORD", occurrenceCount: 2 }))).toMatchObject({
      anchors: ["RECURRENCE"],
      wellEstablished: true,
    });
    expect(
      assessEstablishment(entity({ sire: confident("Any Sire"), birthYear: 2004 })).anchors,
    ).toEqual(["RELIABLE_SIRE", "USABLE_BIRTH_YEAR"]);
  });

  it("never establishes a textual mention, an unnamed entity or an entity without anchors", () => {
    expect(assessEstablishment(entity({ structuralRole: "TEXT_MENTION", dam: confident("Any Dam") }))).toMatchObject({
      wellEstablished: false,
    });
    expect(assessEstablishment(entity({ name: "  ", dam: confident("Any Dam") })).wellEstablished).toBe(false);
    expect(assessEstablishment(entity()).wellEstablished).toBe(false);
  });

  it("ignores anchors that are not usable evidence", () => {
    const assessed = assessEstablishment(
      entity({ dam: { name: "Any Dam", confidence: "AMBIGUOUS" }, birthYear: 0, occurrenceCount: 1 }),
    );
    expect(assessed).toMatchObject({ anchors: [], wellEstablished: false });
  });
});

describe("resolveSourceEntity — candidate generation", () => {
  it("CASE 1: finds candidates through the approved normalisation only", () => {
    const result = resolveSourceEntity(entity({ name: "  silver   BROOK " }), index);
    expect(result.nameKey).toBe("silver brook");
    expect(result.candidates.map((c) => c.horseId)).toEqual([100]);
  });

  it("CASE 2: a studbook suffix or punctuation variant is a different name", () => {
    expect(resolveSourceEntity(entity({ name: "Silver Brook Z" }), index).candidates).toEqual([]);
    expect(resolveSourceEntity(entity({ name: "Silver-Brook" }), index).candidates).toEqual([]);
  });

  it("an unnamed entity cannot be matched or created", () => {
    const result = resolveSourceEntity(entity({ name: null, dam: confident("Brook Lady") }), index);
    expect(result).toMatchObject({
      outcome: "AMBIGUOUS",
      horseId: null,
      nameKey: null,
      candidates: [],
      reasonCodes: ["INSUFFICIENT_SOURCE_ESTABLISHMENT"],
    });
  });
});

describe("resolveSourceEntity — NEW_HORSE", () => {
  it("CASE 3 / 25: zero candidates plus a weak textual mention is not a new horse", () => {
    const result = resolveSourceEntity(
      entity({ name: "Passing Mention", structuralRole: "TEXT_MENTION", dam: confident("Some Dam") }),
      index,
    );
    expect(result).toMatchObject({
      outcome: "AMBIGUOUS",
      reasonCodes: ["NO_PLAUSIBLE_EXISTING_CANDIDATE", "INSUFFICIENT_SOURCE_ESTABLISHMENT"],
      creationProposal: null,
    });
  });

  it("CASE 4: a well-established source horse with no plausible candidate is a creation proposal", () => {
    const result = resolveSourceEntity(
      entity({
        name: "  Brand  New Mare ",
        dam: confident(" Some Dam "),
        sire: { name: "Maybe Sire", confidence: "AMBIGUOUS" },
        birthYear: 2012,
      }),
      index,
    );
    expect(result).toMatchObject({
      outcome: "NEW_HORSE",
      horseId: null,
      reasonCodes: ["NO_PLAUSIBLE_EXISTING_CANDIDATE"],
      creationProposal: {
        name: "Brand New Mare",
        birthYear: 2012,
        sex: "UNKNOWN",
        damName: "Some Dam",
        sireName: null,
        maternalGranddamName: null,
      },
      establishment: { anchors: ["RELIABLE_DAM", "USABLE_BIRTH_YEAR"], wellEstablished: true },
    });
  });

  it("CASE 19: candidates safely excluded by two independent contradictions allow a proposal", () => {
    const result = resolveSourceEntity(
      entity({ name: "Stale Mare", dam: confident("Another Dam"), birthYear: 1995 }),
      index,
    );
    expect(result.outcome).toBe("NEW_HORSE");
    expect(result.candidates).toEqual([expect.objectContaining({ horseId: 140, classification: "EXCLUDED" })]);
  });

  it("CASE 25: a structured record established only by recurrence still qualifies", () => {
    const result = resolveSourceEntity(
      entity({ name: "Recurring Filly", structuralRole: "DESCENDANT_RECORD", occurrenceCount: 3 }),
      index,
    );
    expect(result.outcome).toBe("NEW_HORSE");
  });
});

describe("resolveSourceEntity — EXISTING_HORSE", () => {
  it("CASE 5: a single name candidate without corroboration is never assigned", () => {
    const result = resolveSourceEntity(entity({ name: "Ghost Mare" }), index);
    expect(result).toMatchObject({
      outcome: "AMBIGUOUS",
      horseId: null,
      reasonCodes: ["INSUFFICIENT_CORROBORATION"],
    });
    expect(result.candidates).toEqual([expect.objectContaining({ horseId: 120, classification: "NEUTRAL" })]);
  });

  it("CASE 6: one candidate plus a matching reliable dam is an existing horse", () => {
    const result = resolveSourceEntity(entity({ dam: confident("Brook Lady") }), index);
    expect(result).toMatchObject({ outcome: "EXISTING_HORSE", horseId: 100, reasonCodes: [] });
    expect(result.candidates[0]).toMatchObject({ classification: "SUPPORTED", corroborations: ["DAM"] });
  });

  it("CASE 9 / 12: a usable birth year or a reliable sire corroborates on its own", () => {
    expect(resolveSourceEntity(entity({ birthYear: 2005 }), index)).toMatchObject({
      outcome: "EXISTING_HORSE",
      horseId: 100,
    });
    expect(resolveSourceEntity(entity({ sire: confident("argent") }), index)).toMatchObject({
      outcome: "EXISTING_HORSE",
      horseId: 100,
    });
  });

  it("CASE 15: family evidence separates same-name candidates", () => {
    const result = resolveSourceEntity(entity({ name: "Twin Mare", dam: confident("Twin Dam A") }), index);
    expect(result).toMatchObject({ outcome: "EXISTING_HORSE", horseId: 110 });
    expect(result.candidates.map((c) => [c.horseId, c.classification])).toEqual([
      [110, "SUPPORTED"],
      [111, "CONTRADICTED"],
    ]);
  });

  it("CASE 24: an existing-horse result carries the full signal evidence for every candidate", () => {
    const result = resolveSourceEntity(entity({ dam: confident("Brook Lady"), birthYear: 2005 }), index);
    expect(result.candidates[0].signals).toEqual([
      { signal: "DAM", state: "MATCH", sourceValue: "Brook Lady", candidateValue: "Brook Lady" },
      { signal: "MATERNAL_GRANDDAM", state: "UNKNOWN", sourceValue: null, candidateValue: "Old Lady" },
      { signal: "SIRE", state: "UNKNOWN", sourceValue: null, candidateValue: "Argent" },
      { signal: "BIRTH_YEAR", state: "MATCH", sourceValue: "2005", candidateValue: "2005" },
      { signal: "SEX", state: "UNKNOWN", sourceValue: null, candidateValue: "MARE" },
    ]);
    expect(result.provenance).toEqual({ documentId: "doc-1", nodeId: "n1" });
  });
});

describe("resolveSourceEntity — contradictions", () => {
  it("CASE 7: a single candidate contradicted by a trusted dam is rejected, not assigned and not created", () => {
    const result = resolveSourceEntity(entity({ dam: confident("Another Lady") }), index);
    expect(result).toMatchObject({
      outcome: "AMBIGUOUS",
      horseId: null,
      reasonCodes: ["TRUSTED_PARENT_MISMATCH"],
      creationProposal: null,
    });
    expect(result.candidates[0].classification).toBe("CONTRADICTED");
  });

  it("CASE 8: a clearly identified horse with a stale registry dam stays EXISTING with a canonical data conflict", () => {
    const result = resolveSourceEntity(
      entity({ name: "Stale Mare", dam: confident("Right Dam"), sire: confident("Right Sire"), birthYear: 2003 }),
      index,
    );
    expect(result).toMatchObject({
      outcome: "EXISTING_HORSE",
      horseId: 140,
      reasonCodes: ["DB_PEDIGREE_CONFLICT"],
      canonicalDataConflicts: [
        {
          horseId: 140,
          signal: "DAM",
          sourceValue: "Right Dam",
          canonicalValue: "Wrong Dam",
          reason: "DB_PEDIGREE_CONFLICT",
        },
      ],
    });
    expect(result.candidates[0].classification).toBe("CONFLICTED_SUPPORTED");
  });

  it("CASE 22: a stale-dam candidate beside a data-free namesake is ambiguous, not a conflict-tolerant match", () => {
    const result = resolveSourceEntity(
      entity({ name: "Shadow Mare", dam: confident("Shadow Right Dam"), sire: confident("Shadow Sire"), birthYear: 2003 }),
      index,
    );
    expect(result).toMatchObject({
      outcome: "AMBIGUOUS",
      horseId: null,
      reasonCodes: ["MULTIPLE_VIABLE_CANDIDATES"],
      canonicalDataConflicts: [],
    });
  });

  it("CASE 21: a trusted sex mismatch contradicts even when the dam agrees; a sex match corroborates nothing", () => {
    expect(resolveSourceEntity(entity({ dam: confident("Brook Lady"), sex: "STALLION" }), index)).toMatchObject({
      outcome: "AMBIGUOUS",
      reasonCodes: ["INSUFFICIENT_CORROBORATION", "TRUSTED_SIGNAL_MISMATCH"],
    });
    expect(resolveSourceEntity(entity({ sex: "MARE" }), index)).toMatchObject({
      outcome: "AMBIGUOUS",
      reasonCodes: ["INSUFFICIENT_CORROBORATION"],
    });
  });
});

describe("resolveSourceEntity — unknown evidence", () => {
  it("CASE 10: a source year of 0 is unknown and corroborates nothing", () => {
    expect(resolveSourceEntity(entity({ birthYear: 0 }), index)).toMatchObject({
      outcome: "AMBIGUOUS",
      reasonCodes: ["INSUFFICIENT_CORROBORATION"],
    });
  });

  it("CASE 11: equal junk years are not evidence", () => {
    expect(resolveSourceEntity(entity({ name: "Future Mare", birthYear: 2087 }), index)).toMatchObject({
      outcome: "AMBIGUOUS",
      reasonCodes: ["INSUFFICIENT_CORROBORATION"],
    });
  });

  it("CASE 20: a source year outside the interim range is unknown, not a contradiction", () => {
    const result = resolveSourceEntity(entity({ birthYear: 1899 }), index);
    expect(result.reasonCodes).toEqual(["INSUFFICIENT_CORROBORATION"]);
    expect(result.candidates[0].contradictions).toEqual([]);
  });

  it("CASE 13: an ambiguous dam relation is not positive evidence even when the name agrees", () => {
    const result = resolveSourceEntity(entity({ dam: { name: "Brook Lady", confidence: "AMBIGUOUS" } }), index);
    expect(result).toMatchObject({ outcome: "AMBIGUOUS", reasonCodes: ["INSUFFICIENT_CORROBORATION"] });
    expect(result.candidates[0].signals[0]).toMatchObject({ state: "UNKNOWN", note: "SOURCE_RELATION_AMBIGUOUS" });
  });
});

describe("resolveSourceEntity — irreducible ambiguity", () => {
  it("CASE 14 / 19: several data-free namesakes stay ambiguous with every candidate listed and no tie-break", () => {
    const result = resolveSourceEntity(entity({ name: "Dup Mare", dam: confident("Whoever") }), index);
    expect(result).toMatchObject({
      outcome: "AMBIGUOUS",
      horseId: null,
      reasonCodes: ["MULTIPLE_VIABLE_CANDIDATES"],
    });
    expect(result.candidates.map((c) => c.horseId)).toEqual([130, 131]);
  });

  it("CASE 16: full siblings that agree on every signal are deterministically ambiguous", () => {
    const sib = entity({ name: "Full Sib", dam: confident("Sib Dam"), sire: confident("Sib Sire"), birthYear: 2002 });
    const result = resolveSourceEntity(sib, index);
    expect(result).toMatchObject({ outcome: "AMBIGUOUS", horseId: null, reasonCodes: ["MULTIPLE_VIABLE_CANDIDATES"] });
    expect(result.candidates.map((c) => c.classification)).toEqual(["SUPPORTED", "SUPPORTED"]);
  });

  it("CASE 17: the same evidence yields the same result whatever the load or input order", () => {
    const shuffled = buildStorehorseIndex([...REGISTRY].reverse());
    const entities = [
      entity({ sourceId: "a", name: "Full Sib", dam: confident("Sib Dam") }),
      entity({ sourceId: "b", name: "Twin Mare", dam: confident("Twin Dam B") }),
      entity({ sourceId: "c", name: "Dup Mare" }),
    ];

    const straight = resolveSourceEntities(entities, index);
    const reversed = resolveSourceEntities([...entities].reverse(), shuffled);

    expect(straight.map((r) => r.sourceId)).toEqual(["a", "b", "c"]);
    for (const result of straight) {
      expect(reversed.find((r) => r.sourceId === result.sourceId)).toEqual(result);
    }
    expect(resolveSourceEntity(entities[0], index)).toEqual(resolveSourceEntity(entities[0], index));
  });
});

describe("resolveSourceEntity — safe apostrophe equivalence (HOR-152)", () => {
  it("a typographic spelling generates the ASCII-spelled registry row as a candidate", () => {
    const result = resolveSourceEntity(entity({ name: "Keeper’s Mare" }), index);
    expect(result.nameKey).toBe("keeper's mare");
    expect(result.candidates.map((c) => c.horseId)).toEqual([180]);
  });

  it("equivalence alone never assigns: an established entity stays AMBIGUOUS, never a false NEW_HORSE", () => {
    const result = resolveSourceEntity(entity({ name: "Keeper’s Mare", occurrenceCount: 2 }), index);
    expect(result.establishment.wellEstablished).toBe(true);
    expect(result).toMatchObject({
      outcome: "AMBIGUOUS",
      horseId: null,
      reasonCodes: ["INSUFFICIENT_CORROBORATION"],
      creationProposal: null,
    });
  });

  it("an equivalent candidate with a matching reliable dam resolves EXISTING_HORSE under the standard rules", () => {
    const result = resolveSourceEntity(entity({ name: "Keeper’s Mare", dam: confident("Keeper Dam") }), index);
    expect(result).toMatchObject({ outcome: "EXISTING_HORSE", horseId: 180 });
    expect(result.candidates[0]).toMatchObject({ classification: "SUPPORTED", corroborations: ["DAM"] });
  });

  it("apostrophe equivalence also applies to parent-name signals", () => {
    const result = resolveSourceEntity(entity({ name: "Equiv Filly", dam: confident("Mother’s Pride") }), index);
    expect(result).toMatchObject({ outcome: "EXISTING_HORSE", horseId: 185 });
    expect(result.candidates[0].signals[0]).toMatchObject({ signal: "DAM", state: "MATCH" });
  });

  it("several equivalent-name candidates stay AMBIGUOUS with no tie-break, in horse_id order", () => {
    const result = resolveSourceEntity(entity({ name: "Pair’s Mare", dam: confident("Whoever") }), index);
    expect(result).toMatchObject({
      outcome: "AMBIGUOUS",
      horseId: null,
      reasonCodes: ["MULTIPLE_VIABLE_CANDIDATES"],
    });
    expect(result.candidates.map((c) => c.horseId)).toEqual([190, 191]);
  });

  it("an equivalent candidate with a trusted contradiction follows the standard classification", () => {
    const result = resolveSourceEntity(entity({ name: "Keeper’s Mare", dam: confident("Another Dam") }), index);
    expect(result).toMatchObject({
      outcome: "AMBIGUOUS",
      horseId: null,
      reasonCodes: ["TRUSTED_PARENT_MISMATCH"],
      creationProposal: null,
    });
    expect(result.candidates[0].classification).toBe("CONTRADICTED");
  });

  it("a genuinely new typographically spelled horse still proposes creation, name preserved as printed", () => {
    const result = resolveSourceEntity(
      entity({ name: "Nobody’s Filly", dam: confident("Some Dam"), birthYear: 2015 }),
      index,
    );
    expect(result.outcome).toBe("NEW_HORSE");
    expect(result.creationProposal).toMatchObject({ name: "Nobody’s Filly" });
  });
});

describe("resolveSourceEntities — Word versus Word", () => {
  const viaDam = entity({ sourceId: "a", provenance: { documentId: "doc-1", nodeId: "n1" }, dam: confident("Brook Lady") });
  const viaSireAndYear = entity({
    sourceId: "b",
    provenance: { documentId: "doc-2", nodeId: "n9" },
    dam: confident("Other Lady"),
    sire: confident("Argent"),
    birthYear: 2005,
  });

  it("CASE 18: two assertions resolving to one horse with incompatible parentage both become CONFLICT", () => {
    const [a, b] = resolveSourceEntities([viaDam, viaSireAndYear], index);

    expect(a).toMatchObject({ outcome: "CONFLICT", horseId: null, reasonCodes: ["SOURCE_IDENTITY_CONFLICT"] });
    expect(a.sourceConflicts).toEqual([
      {
        otherSourceId: "b",
        otherProvenance: { documentId: "doc-2", nodeId: "n9" },
        horseId: 100,
        signal: "DAM",
        thisValue: "Brook Lady",
        otherValue: "Other Lady",
      },
    ]);
    expect(b).toMatchObject({ outcome: "CONFLICT", horseId: null, reasonCodes: ["SOURCE_IDENTITY_CONFLICT"] });
    expect(b.sourceConflicts[0]).toMatchObject({ otherSourceId: "a", horseId: 100, signal: "DAM" });
  });

  it("cross-document recurrence with compatible evidence resolves consistently to the same horse", () => {
    const again = entity({ sourceId: "c", provenance: { documentId: "doc-3", nodeId: "n2" }, birthYear: 2005 });
    const results = resolveSourceEntities([viaDam, again], index);

    expect(results.map((r) => [r.outcome, r.horseId])).toEqual([
      ["EXISTING_HORSE", 100],
      ["EXISTING_HORSE", 100],
    ]);
    expect(results.every((r) => r.sourceConflicts.length === 0)).toBe(true);
  });

  it("CASE 23: resolving mutates neither the entities nor the registry rows", () => {
    const frozenRows = REGISTRY.map((r) => Object.freeze({ ...r }));
    const frozenIndex = buildStorehorseIndex(frozenRows);
    const frozenEntities = [viaDam, viaSireAndYear].map((e) =>
      Object.freeze({ ...e, provenance: Object.freeze({ ...e.provenance }) }),
    );

    expect(() => resolveSourceEntities(frozenEntities, frozenIndex)).not.toThrow();
  });
});
