import { describe, expect, it } from "vitest";

import { bufferiseBytesColumn } from "./rawQueryBytes";

/**
 * Prisma 7 returns plain Uint8Array for Bytes/BLOB columns — on the model path
 * AND on $queryRaw. Prisma 6 returned Node Buffer, and the public API contract
 * depends on Buffer's JSON shape: `JSON.stringify(buffer)` gives
 * `{"type":"Buffer","data":[...]}` and `assets/js/functions.js#decodedNotes`
 * reads `notes.data` from exactly that shape. A plain Uint8Array serialises to
 * `{"0":n,...}` instead, `notes.data` becomes undefined, and every breeder
 * note silently disappears. This helper restores the v6 contract at the
 * response boundary.
 */

describe("bufferiseBytesColumn", () => {
  it("converts a Uint8Array column value to a Buffer with the v6 JSON shape", () => {
    const rows = [{ id: 1, notes: new Uint8Array([65, 66, 67]) }];

    const result = bufferiseBytesColumn(rows, "notes");

    expect(Buffer.isBuffer(result[0].notes)).toBe(true);
    expect(JSON.parse(JSON.stringify(result[0].notes))).toEqual({
      type: "Buffer",
      data: [65, 66, 67],
    });
  });

  it("keeps null values null — a breeder without notes stays explicit", () => {
    const rows = [{ id: 1, notes: null }];

    expect(bufferiseBytesColumn(rows, "notes")[0].notes).toBeNull();
  });

  it("leaves rows without the column untouched", () => {
    const rows = [{ id: 1 }] as Array<{ id: number; notes?: Uint8Array }>;

    expect(bufferiseBytesColumn(rows, "notes")).toEqual([{ id: 1 }]);
  });

  it("is idempotent on values that are already Buffers", () => {
    const buffer = Buffer.from([1, 2, 3]);
    const rows = [{ notes: buffer }];

    expect(bufferiseBytesColumn(rows, "notes")[0].notes).toBe(buffer);
  });

  it("does not touch other columns", () => {
    const other = new Uint8Array([9]);
    const rows = [{ notes: new Uint8Array([1]), logo: other }];

    expect(bufferiseBytesColumn(rows, "notes")[0].logo).toBe(other);
  });

  it("returns an empty array unchanged", () => {
    expect(bufferiseBytesColumn([], "notes")).toEqual([]);
  });
});
