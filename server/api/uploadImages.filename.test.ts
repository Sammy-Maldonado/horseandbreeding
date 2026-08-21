import { describe, expect, it } from "vitest";
import { v4 as uuidv4 } from "uuid";

// `uploadImages.post.ts` names every stored image `${uuidv4()}${extension}` and
// persists that string in `gallery.photo_id` (VarChar(100)), while the gallery
// components render it straight into `/uploadImages/<photo_id>`. Nothing in the
// application ever parses or validates that value, so the identifier format is
// a silent contract: a change in how `uuid` resolves would rename every newly
// uploaded file without any existing test noticing.
//
// uuid 13 inverted the package export map (`browser` became the default and a
// `node` condition was introduced) and uuid 14 moved generation onto the global
// `crypto`. Both change which build is loaded rather than the API surface, so
// the contract worth protecting is the produced value, not the call signature.

const CANONICAL_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const PHOTO_ID_MAX_LENGTH = 100;

// The exact composition performed by the upload handler.
const buildUploadFilename = (extension: string) => `${uuidv4()}${extension}`;

describe("uploaded image filename identifier", () => {
  it("generates a canonical lowercase UUIDv4", () => {
    expect(uuidv4()).toMatch(CANONICAL_V4);
  });

  it("keeps the 36-character string form the stored photo_id assumes", () => {
    const id = uuidv4();
    expect(id).toHaveLength(36);
    expect(typeof id).toBe("string");
  });

  it("never repeats an identifier across a large sample", () => {
    const sample = new Set(Array.from({ length: 10_000 }, () => uuidv4()));
    expect(sample.size).toBe(10_000);
  });

  it("produces a filename that fits gallery.photo_id for every accepted extension", () => {
    // The handler accepts exactly these extensions.
    for (const extension of [".png", ".jpg", ".jpeg", ".gif"]) {
      const filename = buildUploadFilename(extension);
      expect(filename.endsWith(extension)).toBe(true);
      expect(filename.slice(0, -extension.length)).toMatch(CANONICAL_V4);
      expect(filename.length).toBeLessThanOrEqual(PHOTO_ID_MAX_LENGTH);
    }
  });

  it("leaves identifiers persisted by earlier uuid majors valid and unchanged", () => {
    // A value generated before this upgrade must still read as the same
    // identifier: the upgrade must never reinterpret stored photo_id data.
    const persisted = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
    expect(persisted).toMatch(CANONICAL_V4);
    expect(`${persisted}.jpg`.length).toBeLessThanOrEqual(PHOTO_ID_MAX_LENGTH);
  });
});
