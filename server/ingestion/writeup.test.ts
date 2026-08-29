import { describe, expect, it } from "vitest";

import {
  decideWriteupPersistence,
  isSeeAboveReference,
  normaliseWriteupContent,
  writeupContentHash,
} from "./writeup";

const MARE_BETA_WRITEUP =
  "MARE_BETA (2009 by HORSE_ALPHA) competed at 1.40m level.\nDam of:\nHORSE_GAMMA (2015) placed at 1.30m level.";

describe("normaliseWriteupContent", () => {
  it("makes typographic and whitespace variants of the same text identical", () => {
    const crlf = MARE_BETA_WRITEUP.replace(/\n/g, "\r\n");
    const spaced = MARE_BETA_WRITEUP.replace(/ /g, "  ").replace(/\n/g, " \n");
    const tabbed = `\t${MARE_BETA_WRITEUP.replace(/ /g, "\t")}  `;

    for (const variant of [crlf, spaced, tabbed]) {
      expect(normaliseWriteupContent(variant)).toBe(normaliseWriteupContent(MARE_BETA_WRITEUP));
    }
  });

  it("applies Unicode NFC so composed and decomposed accents compare equal", () => {
    expect(normaliseWriteupContent("Kévin")).toBe(normaliseWriteupContent("Kévin"));
  });

  it("keeps a paragraph break as one blank line and never changes the words", () => {
    expect(normaliseWriteupContent("A.\n\n\n\nB.")).toBe("A.\n\nB.");
    expect(normaliseWriteupContent(MARE_BETA_WRITEUP)).toBe(MARE_BETA_WRITEUP);
  });

  it("does not change letter case: case is content, not formatting", () => {
    expect(normaliseWriteupContent("Dam of:")).not.toBe(normaliseWriteupContent("DAM OF:"));
  });
});

describe("writeupContentHash", () => {
  it("is a 64-character hex SHA-256 of the normalised content", () => {
    const hash = writeupContentHash(MARE_BETA_WRITEUP);

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(writeupContentHash(MARE_BETA_WRITEUP.replace(/\n/g, "\r\n"))).toBe(hash);
    expect(writeupContentHash(`${MARE_BETA_WRITEUP} Later sold.`)).not.toBe(hash);
  });
});

describe("isSeeAboveReference", () => {
  it.each(["(SEE ABOVE)", "(see above)", " ( See  Above ) ", "SEE ABOVE"])(
    "treats %j as a reference to an existing write-up",
    (text) => {
      expect(isSeeAboveReference(text)).toBe(true);
    },
  );

  it.each(["", "See above for details of MARE_BETA.", MARE_BETA_WRITEUP])(
    "does not treat %j as a bare reference",
    (text) => {
      expect(isSeeAboveReference(text)).toBe(false);
    },
  );
});

describe("decideWriteupPersistence", () => {
  const contentHash = writeupContentHash(MARE_BETA_WRITEUP);

  it("creates the canonical write-up when the mare has none", () => {
    expect(decideWriteupPersistence({ existing: null, content: MARE_BETA_WRITEUP })).toEqual({
      ok: true,
      decision: "CREATE",
      contentHash,
    });
  });

  it("reuses the existing write-up when the content is identical after normalisation", () => {
    const decision = decideWriteupPersistence({
      existing: { contentHash, lifecycleState: "IMPORTED" },
      content: MARE_BETA_WRITEUP.replace(/\n/g, "\r\n"),
    });

    expect(decision).toEqual({ ok: true, decision: "REUSE_IDENTICAL", contentHash });
  });

  it.each(["IMPORTED", "APPROVED", "CORRECTED"] as const)(
    "never overwrites a differing %s write-up: it is a CONFLICT for review",
    (lifecycleState) => {
      const decision = decideWriteupPersistence({
        existing: { contentHash, lifecycleState },
        content: `${MARE_BETA_WRITEUP} Later sold to HORSE_DELTA's owner.`,
      });

      expect(decision).toMatchObject({ ok: true, decision: "CONFLICT" });
      if (decision.ok) expect(decision.contentHash).not.toBe(contentHash);
    },
  );

  it("treats (SEE ABOVE) as a reference and never as content to store", () => {
    expect(decideWriteupPersistence({ existing: null, content: "(SEE ABOVE)" })).toEqual({
      ok: false,
      reason: "SEE_ABOVE_REFERENCE",
    });
    expect(
      decideWriteupPersistence({
        existing: { contentHash, lifecycleState: "APPROVED" },
        content: "(see above)",
      }),
    ).toEqual({ ok: false, reason: "SEE_ABOVE_REFERENCE" });
  });

  it("rejects empty content: a mare without text has no write-up", () => {
    expect(decideWriteupPersistence({ existing: null, content: " \n\t " })).toEqual({
      ok: false,
      reason: "EMPTY_CONTENT",
    });
  });
});
