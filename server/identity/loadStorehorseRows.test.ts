import { describe, expect, it } from "vitest";

import { activeHorseFilter } from "../utils/storehorse-compat";
import {
  STOREHORSE_ROW_SELECT,
  loadStorehorseRows,
  type StorehorseReadClient,
} from "./loadStorehorseRows";

/**
 * A client that answers `storehorse.findMany` and throws on anything else:
 * proves the loader performs exactly one bounded read and no write.
 */
function fakeClient(rows: unknown[]) {
  const calls: unknown[] = [];
  const storehorse = new Proxy(
    {
      findMany: async (args: unknown) => {
        calls.push(args);
        return rows;
      },
    },
    {
      get(target, prop) {
        if (prop !== "findMany") {
          throw new Error(`unexpected storehorse.${String(prop)}`);
        }
        return target.findMany;
      },
    },
  );
  const client = new Proxy(
    { storehorse },
    {
      get(target, prop) {
        if (prop !== "storehorse") {
          throw new Error(`unexpected client.${String(prop)}`);
        }
        return target.storehorse;
      },
    },
  ) as unknown as StorehorseReadClient;
  return { client, calls };
}

describe("loadStorehorseRows", () => {
  it("performs one bounded read of active rows with the minimal column set", async () => {
    const { client, calls } = fakeClient([]);

    await loadStorehorseRows(client);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ where: { ...activeHorseFilter() }, select: STOREHORSE_ROW_SELECT });
    expect(Object.keys(STOREHORSE_ROW_SELECT).sort()).toEqual([
      "birthyear",
      "dam_id",
      "horse_id",
      "name",
      "sexe",
      "sire_id",
    ]);
  });

  it("maps registry columns to the resolver row shape without interpreting sentinels", async () => {
    const { client } = fakeClient([
      { horse_id: 7, name: "Silver Brook", birthyear: 2005, sire_id: 3, dam_id: 2, sexe: 2 },
      { horse_id: 8, name: "", birthyear: 0, sire_id: 0, dam_id: null, sexe: 1 },
    ]);

    await expect(loadStorehorseRows(client)).resolves.toEqual([
      { horseId: 7, name: "Silver Brook", birthYear: 2005, sireId: 3, damId: 2, sex: "UNKNOWN" },
      { horseId: 8, name: "", birthYear: 0, sireId: 0, damId: null, sex: "UNKNOWN" },
    ]);
  });
});
