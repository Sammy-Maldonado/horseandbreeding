/**
 * Canonical write-normalisation boundary contract (HOR-154).
 *
 * Every canonical write path — Word ingestion (HOR-13), future administrator
 * forms, future Excel imports (HOR-18) — must share one server-side
 * normalisation implementation, and that implementation must keep three
 * representations distinct: the raw source value (preserved), the canonical
 * display value (trimmed and single-spaced, nothing else) and the derived
 * comparison key (HOR-14/HOR-152). These tests pin the contract; the numbered
 * cases follow the HOR-154 acceptance list.
 */
import { describe, expect, it } from "vitest";

import {
  horseNameKey,
  normaliseCanonicalTextField,
  normaliseHorseName,
  normaliseWriteupContent,
  writeupContentHash,
} from "./writeNormalisation";
import {
  horseNameKey as identityHorseNameKey,
  normaliseHorseName as identityNormaliseHorseName,
} from "../identity/nameKey";
import {
  normaliseWriteupContent as ingestionNormaliseWriteupContent,
  writeupContentHash as ingestionWriteupContentHash,
} from "../ingestion/writeup";
import { mapResultKind } from "../ingestion/competitionResult";

describe("canonical display value (cases 1-4, 7-9)", () => {
  it("removes outer whitespace from a horse display name", () => {
    expect(normaliseHorseName("  KING’S STAR  ")).toBe("KING’S STAR");
  });

  it("collapses accidental repeated internal whitespace", () => {
    expect(normaliseHorseName("KING’S \t  STAR")).toBe("KING’S STAR");
  });

  it("never forces the display name to lowercase", () => {
    expect(normaliseHorseName("KING’S STAR")).toBe("KING’S STAR");
    expect(normaliseHorseName("KWPN")).toBe("KWPN");
  });

  it("never forces the display name to uppercase or title case", () => {
    expect(normaliseHorseName("king's star")).toBe("king's star");
    expect(normaliseHorseName("van 't Hof")).toBe("van 't Hof");
    expect(normaliseHorseName("kInG's StAr")).toBe("kInG's StAr");
  });

  it("does not strip punctuation", () => {
    expect(normaliseHorseName("J.B. Star (II)")).toBe("J.B. Star (II)");
  });

  it("preserves accents", () => {
    expect(normaliseHorseName("Rêve d'Été Z")).toBe("Rêve d'Été Z");
  });

  it("preserves hyphens", () => {
    expect(normaliseHorseName("Belle-Fleur")).toBe("Belle-Fleur");
  });
});

describe("comparison key stays the HOR-14/HOR-152 contract (cases 5-6)", () => {
  it("is the very same horseNameKey function, not a second normaliser", () => {
    expect(horseNameKey).toBe(identityHorseNameKey);
    expect(normaliseHorseName).toBe(identityNormaliseHorseName);
  });

  it("keeps U+2019 and U+0027 display values distinct while their keys are equivalent", () => {
    const typographic = normaliseHorseName("KING’S STAR");
    const ascii = normaliseHorseName("KING'S STAR");
    expect(typographic).not.toBe(ascii);
    expect(horseNameKey(typographic)).toBe(horseNameKey(ascii));
    expect(horseNameKey(typographic)).toBe("king's star");
  });

  it("case folds for comparison without touching accents, punctuation or hyphens", () => {
    expect(horseNameKey("Rêve d'Été Z")).toBe("rêve d'été z");
    expect(horseNameKey("Belle-Fleur (II)")).toBe("belle-fleur (ii)");
  });
});

describe("categorical values (case 10)", () => {
  it("maps only the closed extractor vocabulary onto the result-kind enum", () => {
    expect(mapResultKind("won")).toEqual({ ok: true, resultKind: "WON" });
    expect(mapResultKind("placed")).toEqual({ ok: true, resultKind: "PLACED" });
    expect(mapResultKind("competed")).toEqual({ ok: true, resultKind: "COMPETED" });
  });

  it("rejects arbitrary display casings instead of persisting them as new categories", () => {
    expect(mapResultKind("Won")).toEqual({ ok: false, reason: "UNKNOWN_PLACING_KIND" });
    expect(mapResultKind("WON")).toEqual({ ok: false, reason: "UNKNOWN_PLACING_KIND" });
    expect(mapResultKind("PLACED")).toEqual({ ok: false, reason: "UNKNOWN_PLACING_KIND" });
  });
});

describe("narrative content (case 11)", () => {
  it("is never case-normalised", () => {
    const text = "Competed at CSI5* level with GREAT success in Genève.";
    expect(normaliseWriteupContent(text)).toBe(text);
  });

  it("applies only the existing formatting-only sanitation", () => {
    expect(normaliseWriteupContent("Won the GP.\r\nDam of:  APPROVED sons.")).toBe(
      "Won the GP.\nDam of: APPROVED sons.",
    );
    expect(normaliseWriteupContent).toBe(ingestionNormaliseWriteupContent);
    expect(writeupContentHash).toBe(ingestionWriteupContentHash);
  });

  it("treats case as content when hashing for reuse detection", () => {
    expect(writeupContentHash("Won the  GP.")).toBe(writeupContentHash("Won the GP."));
    expect(writeupContentHash("won the gp.")).not.toBe(writeupContentHash("Won the GP."));
  });
});

describe("raw source stays distinct from the canonical interpretation (case 12)", () => {
  it("derives the display value without rewriting the raw input", () => {
    const raw = "  KING’S \t STAR  ";
    const display = normaliseHorseName(raw);
    expect(display).toBe("KING’S STAR");
    expect(display).not.toBe(raw);
    expect(raw).toBe("  KING’S \t STAR  ");
  });
});

describe("nullable canonical text fields (rider, event name…)", () => {
  it("applies the same display policy: trim and collapse, nothing else", () => {
    expect(normaliseCanonicalTextField("  Nick   Skelton ")).toBe("Nick Skelton");
    expect(normaliseCanonicalTextField("María-José O'Neill")).toBe("María-José O'Neill");
  });

  it("maps an absent or blank value to null, never to an empty canonical string", () => {
    expect(normaliseCanonicalTextField(null)).toBeNull();
    expect(normaliseCanonicalTextField(undefined)).toBeNull();
    expect(normaliseCanonicalTextField("   ")).toBeNull();
  });
});

describe("idempotency and determinism (cases 13-14)", () => {
  const samples = [
    "  KING’S   STAR  ",
    "king's star",
    "Rêve d'Été Z",
    "Belle-Fleur van 't Hof",
    "KWPN",
    " mixed \t CASE  text ",
  ];

  it("normalising twice equals normalising once", () => {
    for (const sample of samples) {
      const display = normaliseHorseName(sample);
      expect(normaliseHorseName(display)).toBe(display);

      const field = normaliseCanonicalTextField(sample);
      expect(normaliseCanonicalTextField(field)).toBe(field);

      const key = horseNameKey(sample);
      expect(key).not.toBeNull();
      expect(horseNameKey(key)).toBe(key);

      const content = normaliseWriteupContent(sample);
      expect(normaliseWriteupContent(content)).toBe(content);
    }
  });

  it("returns the same output for the same input on every call", () => {
    for (const sample of samples) {
      expect(normaliseHorseName(sample)).toBe(normaliseHorseName(sample));
      expect(horseNameKey(sample)).toBe(horseNameKey(sample));
      expect(normaliseCanonicalTextField(sample)).toBe(normaliseCanonicalTextField(sample));
      expect(writeupContentHash(sample)).toBe(writeupContentHash(sample));
    }
  });
});

describe("server boundary (cases 15-16)", () => {
  it("exposes one shared implementation to every future write path", () => {
    // Ingestion, administrator forms and imports import this module and get
    // the very functions the resolver already trusts — asserted by reference
    // above — so no writer can drift onto a private normaliser.
    expect(typeof normaliseHorseName).toBe("function");
    expect(typeof horseNameKey).toBe("function");
    expect(typeof normaliseCanonicalTextField).toBe("function");
  });

  it("needs no browser environment", () => {
    expect(typeof document).toBe("undefined");
    expect(typeof window).toBe("undefined");
  });
});
