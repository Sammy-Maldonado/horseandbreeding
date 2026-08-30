/**
 * Bounded, read-only registry load for the resolver (HOR-14, ADR-014).
 *
 * One `findMany` over the active rows — named and unnamed, because dam_id /
 * sire_id chains pass through unnamed rows — projected to the six columns
 * the resolver needs. Active-horse semantics come from `activeHorseFilter`
 * and nowhere else. The registry sex column is not interpreted: its default
 * value coincides with a real sex code, so a stored value cannot be told
 * apart from "never set"; every candidate therefore carries `UNKNOWN` sex
 * until an approved mapping exists.
 */
import { activeHorseFilter } from "../utils/storehorse-compat";
import type { StorehorseRow } from "./types";

export const STOREHORSE_ROW_SELECT = {
  horse_id: true,
  name: true,
  birthyear: true,
  sire_id: true,
  dam_id: true,
  sexe: true,
} as const;

export interface RawStorehorseRow {
  horse_id: number;
  name: string | null;
  birthyear: number | null;
  sire_id: number | null;
  dam_id: number | null;
  sexe: number | null;
}

export interface StorehorseFindManyArgs {
  where: ReturnType<typeof activeHorseFilter>;
  select: typeof STOREHORSE_ROW_SELECT;
}

/** The only registry access the resolver performs. */
export interface StorehorseReadClient {
  storehorse: {
    findMany(args: StorehorseFindManyArgs): Promise<RawStorehorseRow[]>;
  };
}

function toStorehorseRow(raw: RawStorehorseRow): StorehorseRow {
  return {
    horseId: raw.horse_id,
    name: raw.name ?? "",
    birthYear: raw.birthyear ?? 0,
    sireId: raw.sire_id,
    damId: raw.dam_id,
    sex: "UNKNOWN",
  };
}

export async function loadStorehorseRows(client: StorehorseReadClient): Promise<StorehorseRow[]> {
  const rows = await client.storehorse.findMany({
    where: { ...activeHorseFilter() },
    select: STOREHORSE_ROW_SELECT,
  });
  return rows.map(toStorehorseRow);
}
