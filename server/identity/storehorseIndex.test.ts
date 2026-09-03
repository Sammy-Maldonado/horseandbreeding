import { describe, expect, it } from "vitest";

import { buildStorehorseIndex } from "./storehorseIndex";
import type { StorehorseRow } from "./types";

function row(overrides: Partial<StorehorseRow> & { horseId: number }): StorehorseRow {
  return {
    name: "",
    birthYear: 0,
    sireId: 0,
    damId: 0,
    sex: "UNKNOWN",
    ...overrides,
  };
}

const MARE = row({ horseId: 10, name: "Silver Brook", birthYear: 2005, damId: 20, sireId: 30 });
const DAM = row({ horseId: 20, name: "Brook Lady", birthYear: 1998, damId: 40 });
const SIRE = row({ horseId: 30, name: "Argent", birthYear: 1990 });
const GRANDDAM = row({ horseId: 40, name: "Old Lady", birthYear: 1985 });
/** A pedigree link target with no name: still needed for the chain, never a candidate. */
const UNNAMED = row({ horseId: 50, name: "   ", damId: 40 });
const NAMESAKE = row({ horseId: 60, name: "silver   brook", birthYear: 2010 });

describe("buildStorehorseIndex", () => {
  const index = buildStorehorseIndex([NAMESAKE, UNNAMED, GRANDDAM, SIRE, DAM, MARE]);

  it("holds every row by id, named or not, so pedigree links resolve", () => {
    expect(index.size).toBe(6);
    expect(index.byId(50)).toEqual(UNNAMED);
    expect(index.byId(999)).toBeUndefined();
  });

  it("indexes only named rows as candidates, bucketed by the comparison key", () => {
    expect(index.namedCount).toBe(5);
    expect(index.candidatesByNameKey("silver brook").map((r) => r.horseId)).toEqual([10, 60]);
    expect(index.candidatesByNameKey("nobody")).toEqual([]);
  });

  it("lists candidates in ascending horse_id order whatever the load order", () => {
    const reversed = buildStorehorseIndex([MARE, NAMESAKE]);
    const straight = buildStorehorseIndex([NAMESAKE, MARE]);

    expect(reversed.candidatesByNameKey("silver brook")).toEqual(
      straight.candidatesByNameKey("silver brook"),
    );
  });

  it("buckets apostrophe-equivalent spellings together, still in horse_id order (HOR-152)", () => {
    const ascii = row({ horseId: 70, name: "Keeper's Mare" });
    const typographic = row({ horseId: 71, name: "Keeper’s Mare" });
    const folded = buildStorehorseIndex([typographic, ascii]);

    expect(folded.candidatesByNameKey("keeper's mare").map((r) => r.horseId)).toEqual([70, 71]);
  });

  it("follows dam_id and sire_id, treating 0, null and dangling ids as unknown", () => {
    expect(index.damOf(MARE)).toEqual(DAM);
    expect(index.sireOf(MARE)).toEqual(SIRE);
    expect(index.damOf(DAM)).toEqual(GRANDDAM);
    expect(index.damOf(GRANDDAM)).toBeUndefined();
    expect(index.sireOf(row({ horseId: 1, sireId: null }))).toBeUndefined();
    expect(index.damOf(row({ horseId: 1, damId: 12345 }))).toBeUndefined();
  });

  it("never depends on mareline_id: the row shape has no such field", () => {
    expect(Object.keys(MARE).sort()).toEqual(
      ["birthYear", "damId", "horseId", "name", "sex", "sireId"],
    );
  });
});
