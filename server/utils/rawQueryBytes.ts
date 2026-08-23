/**
 * Prisma 7 returns plain `Uint8Array` for Bytes/BLOB columns — on the model
 * path and on `$queryRaw` alike. Prisma 6 returned Node `Buffer`, whose JSON
 * shape (`{"type":"Buffer","data":[...]}`) is a public API contract:
 * `assets/js/functions.js#decodedNotes` reads `notes.data` from exactly that
 * shape. This boundary helper restores the v6 contract byte-for-byte before a
 * raw-query result is serialised.
 */
export function bufferiseBytesColumn<T extends Record<string, unknown>>(
  rows: T[],
  column: keyof T & string,
): T[] {
  return rows.map((row) => {
    const value = row[column];

    if (!(value instanceof Uint8Array) || Buffer.isBuffer(value)) {
      return row;
    }

    return { ...row, [column]: Buffer.from(value) } as T;
  });
}
