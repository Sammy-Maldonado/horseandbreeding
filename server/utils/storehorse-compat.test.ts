import { beforeEach, describe, expect, it } from "vitest";
import {
  ACTIVE_HORSE_STATUS,
  activeHorseFilter,
  detectStorehorseStatusColumn,
  horseStatusSelect,
  resetStorehorseStatusCache,
  storehorseSupportsStatus,
} from "./storehorse-compat";

/**
 * Minimal stand-in for the Prisma client surface the detector uses.
 * Only `$queryRaw` is required, so tests never need a real database.
 */
const clientReturning = (rows: unknown[]) => ({
  $queryRaw: async () => rows,
});

const clientThrowing = (error: Error) => ({
  $queryRaw: async () => {
    throw error;
  },
});

describe("activeHorseFilter", () => {
  it("filters on the active status when the database has the column", () => {
    expect(activeHorseFilter(true)).toEqual({ status: ACTIVE_HORSE_STATUS });
  });

  it("returns an empty filter when the database lacks the column", () => {
    expect(activeHorseFilter(false)).toEqual({});
  });

  it("preserves sibling conditions when the column exists", () => {
    const where = { name: { contains: "ELECTRA" }, ...activeHorseFilter(true) };

    expect(where).toEqual({
      name: { contains: "ELECTRA" },
      status: ACTIVE_HORSE_STATUS,
    });
  });

  it("leaves sibling conditions untouched when the column is absent", () => {
    const where = { name: { contains: "ELECTRA" }, ...activeHorseFilter(false) };

    expect(where).toEqual({ name: { contains: "ELECTRA" } });
    expect(where).not.toHaveProperty("status");
  });

  it("never narrows the result set to nothing when the column is absent", () => {
    // An empty object is a no-op filter. `status: undefined` would be too, but
    // `status: null` or `status: 0` would silently return zero horses.
    expect(Object.keys(activeHorseFilter(false))).toHaveLength(0);
  });
});

describe("horseStatusSelect", () => {
  it("selects the column when the database has it", () => {
    expect(horseStatusSelect(true)).toEqual({ status: true });
  });

  it("omits the column when the database lacks it", () => {
    expect(horseStatusSelect(false)).toEqual({});
  });

  it("keeps the rest of the projection intact either way", () => {
    const withStatus = { horse_id: true, ...horseStatusSelect(true) };
    const withoutStatus = { horse_id: true, ...horseStatusSelect(false) };

    expect(withStatus).toEqual({ horse_id: true, status: true });
    expect(withoutStatus).toEqual({ horse_id: true });
  });

  it("never emits `status: false`, which Prisma would reject in a select", () => {
    // A select must contain at least one truthy field; an explicit `false`
    // here would also still name a column that does not exist.
    expect(horseStatusSelect(false)).not.toHaveProperty("status");
  });
});

describe("detectStorehorseStatusColumn", () => {
  it("reports support when information_schema lists the column", async () => {
    const client = clientReturning([{ COLUMN_NAME: "status" }]);

    await expect(detectStorehorseStatusColumn(client)).resolves.toBe(true);
  });

  it("reports no support when information_schema returns no rows", async () => {
    const client = clientReturning([]);

    await expect(detectStorehorseStatusColumn(client)).resolves.toBe(false);
  });

  it("propagates database errors instead of defaulting to a guess", async () => {
    // Silently defaulting would hide a connectivity failure and make every
    // query quietly unfiltered. Missing data must be explicit, not assumed.
    const client = clientThrowing(new Error("connection refused"));

    await expect(detectStorehorseStatusColumn(client)).rejects.toThrow(
      "connection refused"
    );
  });
});

describe("storehorseSupportsStatus", () => {
  beforeEach(() => {
    resetStorehorseStatusCache();
  });

  it("probes the database only once across repeated calls", async () => {
    let probes = 0;
    const client = {
      $queryRaw: async () => {
        probes += 1;
        return [{ COLUMN_NAME: "status" }];
      },
    };

    await storehorseSupportsStatus(client);
    await storehorseSupportsStatus(client);
    await storehorseSupportsStatus(client);

    expect(probes).toBe(1);
  });

  it("caches a negative result too", async () => {
    let probes = 0;
    const client = {
      $queryRaw: async () => {
        probes += 1;
        return [];
      },
    };

    await expect(storehorseSupportsStatus(client)).resolves.toBe(false);
    await expect(storehorseSupportsStatus(client)).resolves.toBe(false);
    expect(probes).toBe(1);
  });

  it("does not cache a failure, so a transient outage can recover", async () => {
    let probes = 0;
    const client = {
      $queryRaw: async () => {
        probes += 1;
        if (probes === 1) throw new Error("connection refused");
        return [{ COLUMN_NAME: "status" }];
      },
    };

    await expect(storehorseSupportsStatus(client)).rejects.toThrow(
      "connection refused"
    );
    await expect(storehorseSupportsStatus(client)).resolves.toBe(true);
    expect(probes).toBe(2);
  });

  it("collapses concurrent callers onto a single probe", async () => {
    let probes = 0;
    const client = {
      $queryRaw: async () => {
        probes += 1;
        return [{ COLUMN_NAME: "status" }];
      },
    };

    await Promise.all([
      storehorseSupportsStatus(client),
      storehorseSupportsStatus(client),
      storehorseSupportsStatus(client),
    ]);

    expect(probes).toBe(1);
  });
});
