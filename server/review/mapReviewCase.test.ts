import { describe, expect, it } from "vitest";

import type { CandidateEvaluation, ReasonCode, ResolutionResult } from "../identity/types";
import { buildReviewCaseKey } from "./keys";
import { mapResolutionToReviewCase } from "./mapReviewCase";

/**
 * Pure mapping from a HOR-14 `ResolutionResult` to the persistable review
 * case input (HOR-142). Only AMBIGUOUS and CONFLICT are review material;
 * everything the human reviewer needs is snapshotted at decision time, and
 * nothing the source_assertion ledger already owns (raw Word text) is
 * duplicated. Fixtures are synthetic — no private catalogue data (CASE 25).
 */

const ASSERTION_KEY = "3f".repeat(32);
const OTHER_ASSERTION_KEY = "5c".repeat(32);
const CONTEXT = { assertionKey: ASSERTION_KEY, resolverContractVersion: "hor14-v1" };

function makeCandidate(overrides: Partial<CandidateEvaluation> = {}): CandidateEvaluation {
  return {
    horseId: 401,
    name: "Fixture Mare Alpha",
    classification: "MIXED",
    signals: [
      { signal: "DAM", state: "MATCH", sourceValue: "fixture dam alpha", candidateValue: "fixture dam alpha" },
      { signal: "SIRE", state: "MISMATCH", sourceValue: "fixture sire beta", candidateValue: "fixture sire gamma" },
      { signal: "BIRTH_YEAR", state: "UNKNOWN", sourceValue: null, candidateValue: null, note: "SOURCE_RELATION_AMBIGUOUS" },
    ],
    corroborations: ["DAM"],
    contradictions: ["SIRE"],
    rejectionReasons: [],
    ...overrides,
  };
}

function makeResult(overrides: Partial<ResolutionResult> = {}): ResolutionResult {
  return {
    sourceId: "entity-1",
    provenance: { documentId: "doc-fixture-1", nodeId: "n-1" },
    outcome: "AMBIGUOUS",
    horseId: null,
    reasonCodes: ["MULTIPLE_VIABLE_CANDIDATES"],
    nameKey: "fixture mare alpha",
    candidates: [makeCandidate({ horseId: 401 }), makeCandidate({ horseId: 355, name: "Fixture Mare Beta" })],
    canonicalDataConflicts: [],
    sourceConflicts: [],
    creationProposal: null,
    establishment: { structuralRole: "DAM_SECTION_HEAD", anchors: ["RELIABLE_DAM"], wellEstablished: true },
    ...overrides,
  };
}

function makeConflictResult(overrides: Partial<ResolutionResult> = {}): ResolutionResult {
  return makeResult({
    outcome: "CONFLICT",
    reasonCodes: ["SOURCE_IDENTITY_CONFLICT"],
    sourceConflicts: [
      {
        otherSourceId: "entity-2",
        otherProvenance: { documentId: "doc-fixture-1", nodeId: "n-9" },
        horseId: 401,
        signal: "DAM",
        thisValue: "fixture dam alpha",
        otherValue: "fixture dam delta",
      },
      {
        otherSourceId: "entity-2",
        otherProvenance: { documentId: "doc-fixture-1", nodeId: "n-9" },
        horseId: 401,
        signal: "BIRTH_YEAR",
        thisValue: "2011",
        otherValue: "2014",
      },
    ],
    ...overrides,
  });
}

describe("mapResolutionToReviewCase — review material (CASE 1, CASE 2)", () => {
  it("maps an AMBIGUOUS result to one review case input", () => {
    const mapped = mapResolutionToReviewCase(makeResult(), CONTEXT);

    expect(mapped.kind).toBe("REVIEW_CASE");
    if (mapped.kind !== "REVIEW_CASE") return;
    expect(mapped.input.outcome).toBe("AMBIGUOUS");
    expect(mapped.input.assertionKey).toBe(ASSERTION_KEY);
    expect(mapped.input.reviewCaseKey).toMatch(/^[0-9a-f]{64}$/);
    expect(mapped.input.resolverContractVersion).toBe("hor14-v1");
  });

  it("maps a CONFLICT result to one review case input", () => {
    const mapped = mapResolutionToReviewCase(makeConflictResult(), CONTEXT);

    expect(mapped.kind).toBe("REVIEW_CASE");
    if (mapped.kind !== "REVIEW_CASE") return;
    expect(mapped.input.outcome).toBe("CONFLICT");
    expect(mapped.input.reasonCodes).toEqual(["SOURCE_IDENTITY_CONFLICT"]);
  });

  it("derives the review case key from the shared deterministic builder", () => {
    const mapped = mapResolutionToReviewCase(makeResult(), CONTEXT);
    const key = buildReviewCaseKey({
      assertionKey: ASSERTION_KEY,
      outcome: "AMBIGUOUS",
      resolverContractVersion: "hor14-v1",
    });

    expect(key.ok).toBe(true);
    if (mapped.kind === "REVIEW_CASE" && key.ok) {
      expect(mapped.input.reviewCaseKey).toBe(key.reviewCaseKey);
    }
  });

  it("tolerates a null name key (unnamed source entity is still review material)", () => {
    const mapped = mapResolutionToReviewCase(
      makeResult({ nameKey: null, candidates: [], reasonCodes: ["INSUFFICIENT_SOURCE_ESTABLISHMENT"] }),
      CONTEXT,
    );

    expect(mapped.kind).toBe("REVIEW_CASE");
    if (mapped.kind !== "REVIEW_CASE") return;
    expect(mapped.input.nameKey).toBeNull();
    expect(mapped.input.candidates).toEqual([]);
  });
});

describe("mapResolutionToReviewCase — not review material (CASE 3, CASE 4, CASE 20)", () => {
  it("EXISTING_HORSE creates no review case", () => {
    const mapped = mapResolutionToReviewCase(
      makeResult({ outcome: "EXISTING_HORSE", horseId: 401, reasonCodes: [] }),
      CONTEXT,
    );

    expect(mapped).toEqual({ kind: "NOT_REVIEW_MATERIAL", outcome: "EXISTING_HORSE" });
  });

  it("NEW_HORSE creates no review case", () => {
    const mapped = mapResolutionToReviewCase(
      makeResult({
        outcome: "NEW_HORSE",
        candidates: [],
        reasonCodes: ["NO_PLAUSIBLE_EXISTING_CANDIDATE"],
        creationProposal: {
          name: "Fixture Filly",
          birthYear: 2019,
          sex: "MARE",
          sireName: null,
          damName: "fixture dam alpha",
          maternalGranddamName: null,
        },
      }),
      CONTEXT,
    );

    expect(mapped).toEqual({ kind: "NOT_REVIEW_MATERIAL", outcome: "NEW_HORSE" });
  });

  it("canonical data conflicts on EXISTING_HORSE alone never open an identity review case", () => {
    const mapped = mapResolutionToReviewCase(
      makeResult({
        outcome: "EXISTING_HORSE",
        horseId: 401,
        reasonCodes: ["DB_PEDIGREE_CONFLICT"],
        canonicalDataConflicts: [
          {
            horseId: 401,
            signal: "SIRE",
            sourceValue: "fixture sire beta",
            canonicalValue: "fixture sire gamma",
            reason: "DB_PEDIGREE_CONFLICT",
          },
        ],
      }),
      CONTEXT,
    );

    expect(mapped).toEqual({ kind: "NOT_REVIEW_MATERIAL", outcome: "EXISTING_HORSE" });
  });
});

describe("mapResolutionToReviewCase — evidence snapshot fidelity", () => {
  it("preserves every candidate horse id (CASE 6)", () => {
    const mapped = mapResolutionToReviewCase(makeResult(), CONTEXT);

    expect(mapped.kind).toBe("REVIEW_CASE");
    if (mapped.kind !== "REVIEW_CASE") return;
    expect(mapped.input.candidates.map((c) => c.horseId).sort((a, b) => a - b)).toEqual([355, 401]);
  });

  it("preserves per-signal MATCH / MISMATCH / UNKNOWN evidence verbatim (CASE 7)", () => {
    const mapped = mapResolutionToReviewCase(makeResult(), CONTEXT);

    expect(mapped.kind).toBe("REVIEW_CASE");
    if (mapped.kind !== "REVIEW_CASE") return;
    const candidate = mapped.input.candidates.find((c) => c.horseId === 401);
    expect(candidate?.signals).toEqual(makeCandidate().signals);
    expect(candidate?.corroborations).toEqual(["DAM"]);
    expect(candidate?.contradictions).toEqual(["SIRE"]);
    expect(candidate?.classification).toBe("MIXED");
    expect(candidate?.candidateName).toBe("Fixture Mare Alpha");
  });

  it("round-trips reason codes in order without redefining them (CASE 8)", () => {
    const reasonCodes = ["INSUFFICIENT_CORROBORATION", "TRUSTED_PARENT_MISMATCH"] as ReasonCode[];
    const mapped = mapResolutionToReviewCase(makeResult({ reasonCodes }), CONTEXT);

    expect(mapped.kind).toBe("REVIEW_CASE");
    if (mapped.kind !== "REVIEW_CASE") return;
    expect(mapped.input.reasonCodes).toEqual(reasonCodes);
  });

  it("carries a future additive reason code through untouched (CASE 8)", () => {
    const reasonCodes = ["MULTIPLE_VIABLE_CANDIDATES", "FUTURE_ADDITIVE_CODE"] as unknown as ReasonCode[];
    const mapped = mapResolutionToReviewCase(makeResult({ reasonCodes }), CONTEXT);

    expect(mapped.kind).toBe("REVIEW_CASE");
    if (mapped.kind !== "REVIEW_CASE") return;
    expect(mapped.input.reasonCodes).toEqual(["MULTIPLE_VIABLE_CANDIDATES", "FUTURE_ADDITIVE_CODE"]);
  });

  it("preserves both sides of a Word-versus-Word conflict with their provenance (CASE 9)", () => {
    const result = makeConflictResult();
    const mapped = mapResolutionToReviewCase(result, CONTEXT);

    expect(mapped.kind).toBe("REVIEW_CASE");
    if (mapped.kind !== "REVIEW_CASE") return;
    expect(mapped.input.sourceConflicts).toEqual(result.sourceConflicts);
    expect(mapped.input.sourceConflicts[0]?.otherProvenance).toEqual({ documentId: "doc-fixture-1", nodeId: "n-9" });
  });

  it("preserves the establishment evidence snapshot", () => {
    const mapped = mapResolutionToReviewCase(makeResult(), CONTEXT);

    expect(mapped.kind).toBe("REVIEW_CASE");
    if (mapped.kind !== "REVIEW_CASE") return;
    expect(mapped.input.establishment).toEqual({
      structuralRole: "DAM_SECTION_HEAD",
      anchors: ["RELIABLE_DAM"],
      wellEstablished: true,
    });
  });

  it("snapshots are copies: mutating the resolver result afterwards changes nothing", () => {
    const result = makeResult();
    const mapped = mapResolutionToReviewCase(result, CONTEXT);

    result.candidates[0].signals[0].state = "MISMATCH";
    result.reasonCodes.push("DB_PEDIGREE_CONFLICT");
    result.establishment.anchors.push("RECURRENCE");

    expect(mapped.kind).toBe("REVIEW_CASE");
    if (mapped.kind !== "REVIEW_CASE") return;
    expect(mapped.input.candidates[0]?.signals[0]?.state).toBe("MATCH");
    expect(mapped.input.reasonCodes).toEqual(["MULTIPLE_VIABLE_CANDIDATES"]);
    expect(mapped.input.establishment.anchors).toEqual(["RELIABLE_DAM"]);
  });
});

describe("mapResolutionToReviewCase — minimal duplication, durable identity (CASE 5, CASE 10, CASE 12)", () => {
  it("links to the originating source assertion by its durable key only (CASE 5)", () => {
    const mapped = mapResolutionToReviewCase(makeResult(), CONTEXT);

    expect(mapped.kind).toBe("REVIEW_CASE");
    if (mapped.kind !== "REVIEW_CASE") return;
    expect(mapped.input.assertionKey).toBe(ASSERTION_KEY);
  });

  it("duplicates no raw Word content owned by source_assertion (CASE 10)", () => {
    const mapped = mapResolutionToReviewCase(makeResult(), CONTEXT);

    expect(mapped.kind).toBe("REVIEW_CASE");
    if (mapped.kind !== "REVIEW_CASE") return;
    expect(Object.keys(mapped.input).sort()).toEqual([
      "assertionKey",
      "candidates",
      "establishment",
      "nameKey",
      "outcome",
      "reasonCodes",
      "resolverContractVersion",
      "reviewCaseKey",
      "sourceConflicts",
    ]);
    for (const candidate of mapped.input.candidates) {
      expect(Object.keys(candidate).sort()).toEqual([
        "candidateName",
        "candidateOrder",
        "classification",
        "contradictions",
        "corroborations",
        "horseId",
        "rejectionReasons",
        "signals",
      ]);
    }
  });

  it("two assertions sharing a normalised name map to distinct review cases (CASE 12)", () => {
    const first = mapResolutionToReviewCase(makeResult(), CONTEXT);
    const second = mapResolutionToReviewCase(makeResult({ sourceId: "entity-7" }), {
      ...CONTEXT,
      assertionKey: OTHER_ASSERTION_KEY,
    });

    expect(first.kind).toBe("REVIEW_CASE");
    expect(second.kind).toBe("REVIEW_CASE");
    if (first.kind !== "REVIEW_CASE" || second.kind !== "REVIEW_CASE") return;
    expect(first.input.nameKey).toBe(second.input.nameKey);
    expect(first.input.reviewCaseKey).not.toBe(second.input.reviewCaseKey);
  });
});

describe("mapResolutionToReviewCase — deterministic candidate order, no selection (CASE 21, CASE 22)", () => {
  it("stores candidates in ascending horse id order with explicit positions (CASE 22)", () => {
    const shuffled = makeResult({
      candidates: [
        makeCandidate({ horseId: 900, name: "Fixture Mare Gamma" }),
        makeCandidate({ horseId: 12, name: "Fixture Mare Delta" }),
        makeCandidate({ horseId: 355, name: "Fixture Mare Beta" }),
      ],
    });
    const mapped = mapResolutionToReviewCase(shuffled, CONTEXT);

    expect(mapped.kind).toBe("REVIEW_CASE");
    if (mapped.kind !== "REVIEW_CASE") return;
    expect(mapped.input.candidates.map((c) => c.horseId)).toEqual([12, 355, 900]);
    expect(mapped.input.candidates.map((c) => c.candidateOrder)).toEqual([0, 1, 2]);
  });

  it("marks no candidate as selected, preferred or chosen (CASE 21)", () => {
    const mapped = mapResolutionToReviewCase(makeResult(), CONTEXT);

    expect(mapped.kind).toBe("REVIEW_CASE");
    if (mapped.kind !== "REVIEW_CASE") return;
    for (const candidate of mapped.input.candidates) {
      for (const key of Object.keys(candidate)) {
        expect(key).not.toMatch(/select|chosen|preferred|winner|best/i);
      }
    }
  });
});

describe("mapResolutionToReviewCase — rejected inputs", () => {
  it("rejects a malformed assertion key", () => {
    const mapped = mapResolutionToReviewCase(makeResult(), {
      assertionKey: "not-a-durable-key",
      resolverContractVersion: "hor14-v1",
    });

    expect(mapped).toEqual({ kind: "REJECTED", reason: "INVALID_ASSERTION_KEY" });
  });

  it("rejects an unusable contract version", () => {
    const mapped = mapResolutionToReviewCase(makeResult(), {
      assertionKey: ASSERTION_KEY,
      resolverContractVersion: "",
    });

    expect(mapped).toEqual({ kind: "REJECTED", reason: "INVALID_CONTRACT_VERSION" });
  });
});
