/**
 * In-memory candidate index over the active registry (HOR-14).
 *
 * `storehorse.name` has no index and a per-entity equality query costs about
 * as much as a full scan, so the resolver reads the active rows once and
 * resolves every entity against this structure. Every row enters `byId` so
 * dam_id / sire_id chains resolve even through unnamed rows; only rows with
 * usable name text become candidates. Candidate lists are ordered by
 * horse_id for stable output — order is presentation, never selection.
 *
 * Pure: rows in, lookups out. Nothing here depends on `mareline_id`.
 */
import { horseNameKey } from "./nameKey";
import type { StorehorseRow } from "./types";

export interface StorehorseIndex {
  /** Rows loaded, named or not. */
  readonly size: number;
  /** Rows that can be name candidates. */
  readonly namedCount: number;
  byId(horseId: number): StorehorseRow | undefined;
  candidatesByNameKey(key: string): StorehorseRow[];
  damOf(row: StorehorseRow): StorehorseRow | undefined;
  sireOf(row: StorehorseRow): StorehorseRow | undefined;
}

function byHorseId(a: StorehorseRow, b: StorehorseRow): number {
  return a.horseId - b.horseId;
}

export function buildStorehorseIndex(rows: Iterable<StorehorseRow>): StorehorseIndex {
  const byId = new Map<number, StorehorseRow>();
  const byName = new Map<string, StorehorseRow[]>();

  for (const row of rows) {
    byId.set(row.horseId, row);
    const key = horseNameKey(row.name);
    if (key === null) {
      continue;
    }
    const bucket = byName.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      byName.set(key, [row]);
    }
  }
  let namedCount = 0;
  for (const bucket of byName.values()) {
    bucket.sort(byHorseId);
    namedCount += bucket.length;
  }

  const parent = (id: number | null): StorehorseRow | undefined =>
    id ? byId.get(id) : undefined;

  return {
    size: byId.size,
    namedCount,
    byId: (horseId) => byId.get(horseId),
    candidatesByNameKey: (key) => [...(byName.get(key) ?? [])],
    damOf: (row) => parent(row.damId),
    sireOf: (row) => parent(row.sireId),
  };
}
