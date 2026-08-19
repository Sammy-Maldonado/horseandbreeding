import { describe, expect, it } from "vitest";
import {
  ACTIVE_HORSE_STATUS,
  activeHorseFilter,
  horseStatusSelect,
} from "./storehorse-compat";

/**
 * `storehorse.status` semantics (HOR-94, previously ADR-006 / HOR-35).
 *
 * The runtime capability probe is retired: since the
 * `*_storehorse_status_active_backfill` migration, every database in the
 * supported rebuild path carries `status INTEGER NOT NULL DEFAULT 1`, so the
 * "column absent" branch the probe existed for no longer describes any real
 * environment. The helpers are now unconditional and this module remains the
 * single owner of the active-status semantics.
 */

describe("activeHorseFilter", () => {
  it("always filters on the active status", () => {
    expect(activeHorseFilter()).toEqual({ status: ACTIVE_HORSE_STATUS });
  });

  it("preserves sibling conditions", () => {
    const where = { name: { contains: "ELECTRA" }, ...activeHorseFilter() };

    expect(where).toEqual({
      name: { contains: "ELECTRA" },
      status: ACTIVE_HORSE_STATUS,
    });
  });
});

describe("horseStatusSelect", () => {
  it("always selects the column", () => {
    expect(horseStatusSelect()).toEqual({ status: true });
  });

  it("keeps the rest of the projection intact", () => {
    const select = { horse_id: true, ...horseStatusSelect() };

    expect(select).toEqual({ horse_id: true, status: true });
  });
});

describe("module surface", () => {
  it("no longer exposes a runtime capability probe", async () => {
    // Locks the retirement in: reintroducing a probe (and with it the
    // possibility of an unfiltered or empty-filtered branch) must be a
    // deliberate decision that changes this test, not a quiet regression.
    const surface = await import("./storehorse-compat");

    expect(Object.keys(surface).sort()).toEqual([
      "ACTIVE_HORSE_STATUS",
      "activeHorseFilter",
      "horseStatusSelect",
    ]);
  });
});
