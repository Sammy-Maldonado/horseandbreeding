import { describe, expect, it } from "vitest";

import type { CandidateEvaluation, ResolutionResult } from "../identity/types";
import { derivePersistenceState } from "../ingestion/persistenceState";
import { mapResolutionToReviewCase } from "./mapReviewCase";
import {
  persistReviewCases,
  recordReviewDecision,
  type ReviewPersistenceClient,
  type ReviewTransactionClient,
  type StoredReviewCandidate,
  type StoredReviewCase,
  type StoredSourceAssertion,
} from "./persistReviewCases";
import type { ReviewCaseInput } from "./types";

/**
 * Repository behaviour of HOR-142 review persistence, tested against an
 * in-memory client stand-in (the same boundary-mock approach as
 * `storehorse-compat.test.ts`): atomic transaction with rollback (CASE 18),
 * idempotent re-persistence (CASE 11), zero-loss alignment of the source
 * assertion (CASE 19), and a client surface that simply has no way to touch
 * `storehorse` (CASE 13, CASE 14). All fixtures are synthetic (CASE 25).
 */

const KEY_A = "3f".repeat(32);
const KEY_B = "5c".repeat(32);
const VERSION = "hor14-v1";

function makeCandidate(overrides: Partial<CandidateEvaluation> = {}): CandidateEvaluation {
  return {
    horseId: 401,
    name: "Fixture Mare Alpha",
    classification: "MIXED",
    signals: [
      { signal: "DAM", state: "MATCH", sourceValue: "fixture dam alpha", candidateValue: "fixture dam alpha" },
      { signal: "SIRE", state: "MISMATCH", sourceValue: "fixture sire beta", candidateValue: "fixture sire gamma" },
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

function reviewInput(assertionKey: string, overrides: Partial<ResolutionResult> = {}): ReviewCaseInput {
  const mapped = mapResolutionToReviewCase(makeResult(overrides), {
    assertionKey,
    resolverContractVersion: VERSION,
  });
  if (mapped.kind !== "REVIEW_CASE") throw new Error("fixture must be review material");
  return mapped.input;
}

function conflictInput(assertionKey: string): ReviewCaseInput {
  return reviewInput(assertionKey, {
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
  });
}

interface Store {
  assertions: StoredSourceAssertion[];
  cases: StoredReviewCase[];
  candidates: StoredReviewCandidate[];
}

function makeAssertion(assertionKey: string, overrides: Partial<StoredSourceAssertion> = {}): StoredSourceAssertion {
  return {
    source_assertion_id: 1,
    assertion_key: assertionKey,
    assertion_kind: "SUBJECT_IDENTITY",
    persistence_state: "PRESERVED_SOURCE_FACT",
    resolution_outcome: "NOT_ATTEMPTED",
    horse_id: null,
    ...overrides,
  };
}

function makeStore(assertions: StoredSourceAssertion[]): Store {
  return { assertions, cases: [], candidates: [] };
}

/**
 * In-memory Prisma stand-in. `$transaction` snapshots the store and restores
 * it when the callback throws — the rollback semantics the real client
 * guarantees. Every delegate call is logged so tests can prove the repository
 * never addressed anything but the three review-facing tables.
 */
function makeClient(store: Store, options: { failOn?: string } = {}) {
  const callLog: string[] = [];
  const fail = (operation: string) => {
    if (options.failOn === operation) throw new Error("injected failure");
  };

  const tx: ReviewTransactionClient = {
    source_assertion: {
      async findUnique({ where }) {
        callLog.push("source_assertion.findUnique");
        return structuredClone(store.assertions.find((a) => a.assertion_key === where.assertion_key) ?? null);
      },
      async update({ where, data }) {
        callLog.push("source_assertion.update");
        fail("source_assertion.update");
        const row = store.assertions.find((a) => a.source_assertion_id === where.source_assertion_id);
        if (!row) throw new Error("assertion row missing");
        Object.assign(row, data);
        return structuredClone(row);
      },
    },
    identity_review_case: {
      async findUnique({ where }) {
        callLog.push("identity_review_case.findUnique");
        return structuredClone(store.cases.find((c) => c.review_case_key === where.review_case_key) ?? null);
      },
      async create({ data }) {
        callLog.push("identity_review_case.create");
        fail("identity_review_case.create");
        const row = { identity_review_case_id: store.cases.length + 1, ...structuredClone(data) };
        store.cases.push(row);
        return structuredClone(row);
      },
      async update({ where, data }) {
        callLog.push("identity_review_case.update");
        const row = store.cases.find((c) => c.review_case_key === where.review_case_key);
        if (!row) throw new Error("case row missing");
        Object.assign(row, structuredClone(data));
        return structuredClone(row);
      },
    },
    identity_review_candidate: {
      async create({ data }) {
        callLog.push("identity_review_candidate.create");
        fail("identity_review_candidate.create");
        const row = { identity_review_candidate_id: store.candidates.length + 1, ...structuredClone(data) };
        store.candidates.push(row);
        return structuredClone(row);
      },
    },
  };

  const client: ReviewPersistenceClient = {
    async $transaction(fn) {
      const snapshot = structuredClone(store);
      try {
        return await fn(tx);
      } catch (error) {
        store.assertions = snapshot.assertions;
        store.cases = snapshot.cases;
        store.candidates = snapshot.candidates;
        throw error;
      }
    },
  };

  return { client, callLog };
}

const DECISION_AT = new Date("2026-08-31T12:00:00Z");

function keptTextOnly() {
  return {
    decision: "KEPT_TEXT_ONLY" as const,
    decidedHorseId: null,
    decidedBy: "reviewer-fixture",
    decidedAt: DECISION_AT,
    decisionNote: "stays a text-only descendant",
  };
}

describe("persistReviewCases — creation (CASE 1, CASE 2, CASE 5, CASE 19)", () => {
  it("persists one AMBIGUOUS review case with its candidates, linked to the source assertion", async () => {
    const store = makeStore([makeAssertion(KEY_A)]);
    const { client } = makeClient(store);
    const input = reviewInput(KEY_A);

    const result = await persistReviewCases(client, [input]);

    expect(result).toEqual({ ok: true, results: [{ reviewCaseKey: input.reviewCaseKey, status: "CREATED" }] });
    expect(store.cases).toHaveLength(1);
    expect(store.cases[0]).toMatchObject({
      review_case_key: input.reviewCaseKey,
      source_assertion_id: 1,
      outcome: "AMBIGUOUS",
      name_key: "fixture mare alpha",
      reason_codes: ["MULTIPLE_VIABLE_CANDIDATES"],
      resolver_contract_version: VERSION,
      review_state: "OPEN",
      decision: null,
      decided_horse_id: null,
      decided_by: null,
      decided_at: null,
    });
    expect(store.candidates).toHaveLength(2);
    expect(store.candidates.map((c) => [c.identity_review_case_id, c.horse_id, c.candidate_order])).toEqual([
      [1, 355, 0],
      [1, 401, 1],
    ]);
  });

  it("persists one CONFLICT review case preserving both conflicting source references (CASE 9)", async () => {
    const store = makeStore([makeAssertion(KEY_A)]);
    const { client } = makeClient(store);
    const input = conflictInput(KEY_A);

    const result = await persistReviewCases(client, [input]);

    expect(result.ok).toBe(true);
    expect(store.cases[0]).toMatchObject({ outcome: "CONFLICT", reason_codes: ["SOURCE_IDENTITY_CONFLICT"] });
    expect(store.cases[0]?.source_conflicts).toEqual(input.sourceConflicts);
  });

  it("aligns the source assertion with the shared zero-loss rules (CASE 19)", async () => {
    const store = makeStore([makeAssertion(KEY_A)]);
    const { client } = makeClient(store);

    await persistReviewCases(client, [reviewInput(KEY_A)]);

    const expectedState = derivePersistenceState({
      accountingStatus: "PARSED",
      assertionKind: "SUBJECT_IDENTITY",
      resolutionOutcome: "AMBIGUOUS",
    });
    expect(expectedState).toBe("AMBIGUOUS");
    expect(store.assertions[0]).toMatchObject({
      resolution_outcome: "AMBIGUOUS",
      persistence_state: "AMBIGUOUS",
      horse_id: null,
    });
  });

  it("persists distinct cases for distinct assertions sharing a normalised name (CASE 12)", async () => {
    const store = makeStore([
      makeAssertion(KEY_A, { source_assertion_id: 1 }),
      makeAssertion(KEY_B, { source_assertion_id: 2 }),
    ]);
    const { client } = makeClient(store);

    const result = await persistReviewCases(client, [reviewInput(KEY_A), reviewInput(KEY_B)]);

    expect(result.ok).toBe(true);
    expect(store.cases).toHaveLength(2);
    expect(store.cases.map((c) => c.source_assertion_id)).toEqual([1, 2]);
    expect(new Set(store.cases.map((c) => c.review_case_key)).size).toBe(2);
  });
});

describe("persistReviewCases — idempotency (CASE 11, CASE 15)", () => {
  it("re-persisting the same outcome creates nothing and rewrites nothing", async () => {
    const store = makeStore([makeAssertion(KEY_A)]);
    const { client } = makeClient(store);
    const input = reviewInput(KEY_A);

    await persistReviewCases(client, [input]);
    const before = structuredClone({ cases: store.cases, candidates: store.candidates });

    const second = await persistReviewCases(client, [input]);

    expect(second).toEqual({
      ok: true,
      results: [{ reviewCaseKey: input.reviewCaseKey, status: "ALREADY_PERSISTED" }],
    });
    expect(store.cases).toEqual(before.cases);
    expect(store.candidates).toEqual(before.candidates);
  });

  it("re-persisting after a human decision keeps the decision and the evidence", async () => {
    const store = makeStore([makeAssertion(KEY_A)]);
    const { client } = makeClient(store);
    const input = reviewInput(KEY_A);

    await persistReviewCases(client, [input]);
    await recordReviewDecision(client, { reviewCaseKey: input.reviewCaseKey, ...keptTextOnly() });
    const before = structuredClone(store.cases);

    const again = await persistReviewCases(client, [input]);

    expect(again.ok).toBe(true);
    if (again.ok) expect(again.results[0]?.status).toBe("ALREADY_PERSISTED");
    expect(store.cases).toEqual(before);
  });
});

describe("persistReviewCases — atomicity and rejection (CASE 18)", () => {
  it("a transaction failure leaves no partial review persistence", async () => {
    const store = makeStore([makeAssertion(KEY_A)]);
    const { client } = makeClient(store, { failOn: "identity_review_candidate.create" });

    await expect(persistReviewCases(client, [reviewInput(KEY_A)])).rejects.toThrow("injected failure");

    expect(store.cases).toEqual([]);
    expect(store.candidates).toEqual([]);
    expect(store.assertions[0]).toMatchObject({
      resolution_outcome: "NOT_ATTEMPTED",
      persistence_state: "PRESERVED_SOURCE_FACT",
    });
  });

  it("rejects a review case whose source assertion does not exist, atomically", async () => {
    const store = makeStore([makeAssertion(KEY_A)]);
    const { client } = makeClient(store);

    const result = await persistReviewCases(client, [reviewInput(KEY_A), reviewInput(KEY_B)]);

    expect(result).toEqual({ ok: false, reason: "MISSING_SOURCE_ASSERTION", assertionKey: KEY_B });
    expect(store.cases).toEqual([]);
    expect(store.candidates).toEqual([]);
    expect(store.assertions[0]).toMatchObject({ resolution_outcome: "NOT_ATTEMPTED" });
  });

  it("rejects an assertion already attached to a horse instead of silently overwriting it", async () => {
    const store = makeStore([makeAssertion(KEY_A, { horse_id: 77 })]);
    const { client } = makeClient(store);

    const result = await persistReviewCases(client, [reviewInput(KEY_A)]);

    expect(result).toEqual({
      ok: false,
      reason: "INVALID_ASSERTION_LINKS",
      assertionKey: KEY_A,
      detail: "AMBIGUOUS_MUST_NOT_ASSIGN_HORSE",
    });
    expect(store.cases).toEqual([]);
    expect(store.assertions[0]).toMatchObject({ horse_id: 77, resolution_outcome: "NOT_ATTEMPTED" });
  });
});

describe("persistReviewCases — storehorse is out of reach (CASE 13, CASE 14)", () => {
  it("addresses only the three review-facing tables, never storehorse", async () => {
    const store = makeStore([makeAssertion(KEY_A)]);
    const { client, callLog } = makeClient(store);

    await persistReviewCases(client, [reviewInput(KEY_A)]);
    const input = reviewInput(KEY_A);
    await recordReviewDecision(client, {
      reviewCaseKey: input.reviewCaseKey,
      decision: "ASSIGNED_EXISTING_HORSE",
      decidedHorseId: 421,
      decidedBy: "reviewer-fixture",
      decidedAt: DECISION_AT,
      decisionNote: null,
    });

    expect(callLog.length).toBeGreaterThan(0);
    for (const call of callLog) {
      expect(call).toMatch(/^(source_assertion|identity_review_case|identity_review_candidate)\./);
    }
  });
});

describe("recordReviewDecision — review lifecycle (CASE 15, CASE 16, CASE 17)", () => {
  async function persisted(store: Store, client: ReviewPersistenceClient) {
    const input = reviewInput(KEY_A);
    await persistReviewCases(client, [input]);
    return input;
  }

  it("records who and when, moves the case to DECIDED, and deletes no original evidence (CASE 15)", async () => {
    const store = makeStore([makeAssertion(KEY_A)]);
    const { client } = makeClient(store);
    const input = await persisted(store, client);
    const evidenceBefore = structuredClone({
      reason_codes: store.cases[0]?.reason_codes,
      source_conflicts: store.cases[0]?.source_conflicts,
      establishment: store.cases[0]?.establishment,
      candidates: store.candidates,
    });

    const result = await recordReviewDecision(client, { reviewCaseKey: input.reviewCaseKey, ...keptTextOnly() });

    expect(result.ok).toBe(true);
    expect(store.cases[0]).toMatchObject({
      review_state: "DECIDED",
      decision: "KEPT_TEXT_ONLY",
      decided_horse_id: null,
      decided_by: "reviewer-fixture",
      decided_at: DECISION_AT,
      decision_note: "stays a text-only descendant",
    });
    expect(store.cases[0]?.reason_codes).toEqual(evidenceBefore.reason_codes);
    expect(store.cases[0]?.source_conflicts).toEqual(evidenceBefore.source_conflicts);
    expect(store.cases[0]?.establishment).toEqual(evidenceBefore.establishment);
    expect(store.candidates).toEqual(evidenceBefore.candidates);
  });

  it("an assignment references storehorse.horse_id without creating any horse entity (CASE 16)", async () => {
    const store = makeStore([makeAssertion(KEY_A)]);
    const { client, callLog } = makeClient(store);
    const input = await persisted(store, client);

    const result = await recordReviewDecision(client, {
      reviewCaseKey: input.reviewCaseKey,
      decision: "ASSIGNED_EXISTING_HORSE",
      decidedHorseId: 421,
      decidedBy: "reviewer-fixture",
      decidedAt: DECISION_AT,
      decisionNote: null,
    });

    expect(result.ok).toBe(true);
    expect(store.cases[0]).toMatchObject({ decision: "ASSIGNED_EXISTING_HORSE", decided_horse_id: 421 });
    expect(callLog.filter((c) => c.startsWith("identity_review_case.create"))).toHaveLength(1);
    expect(callLog.every((c) => !c.includes("storehorse"))).toBe(true);
  });

  it("a NEW_HORSE approval is representable without HOR-142 inserting the horse (CASE 17)", async () => {
    const store = makeStore([makeAssertion(KEY_A)]);
    const { client } = makeClient(store);
    const input = await persisted(store, client);
    const casesBefore = store.cases.length;
    const candidatesBefore = store.candidates.length;

    const result = await recordReviewDecision(client, {
      reviewCaseKey: input.reviewCaseKey,
      decision: "APPROVED_NEW_HORSE",
      decidedHorseId: null,
      decidedBy: "reviewer-fixture",
      decidedAt: DECISION_AT,
      decisionNote: "creation executes later under the ADR-018 contract",
    });

    expect(result.ok).toBe(true);
    expect(store.cases[0]).toMatchObject({ decision: "APPROVED_NEW_HORSE", decided_horse_id: null });
    expect(store.cases).toHaveLength(casesBefore);
    expect(store.candidates).toHaveLength(candidatesBefore);
    expect(store.assertions[0]).toMatchObject({ resolution_outcome: "AMBIGUOUS", horse_id: null });
  });

  it("rejects a malformed decision and changes nothing", async () => {
    const store = makeStore([makeAssertion(KEY_A)]);
    const { client } = makeClient(store);
    const input = await persisted(store, client);
    const before = structuredClone(store.cases);

    const result = await recordReviewDecision(client, {
      reviewCaseKey: input.reviewCaseKey,
      decision: "ASSIGNED_EXISTING_HORSE",
      decidedHorseId: null,
      decidedBy: "reviewer-fixture",
      decidedAt: DECISION_AT,
      decisionNote: null,
    });

    expect(result).toEqual({ ok: false, reason: "ASSIGNED_DECISION_REQUIRES_HORSE" });
    expect(store.cases).toEqual(before);
  });

  it("rejects a decision on a review case that does not exist", async () => {
    const store = makeStore([makeAssertion(KEY_A)]);
    const { client } = makeClient(store);

    const result = await recordReviewDecision(client, {
      reviewCaseKey: "ab".repeat(32),
      ...keptTextOnly(),
    });

    expect(result).toEqual({ ok: false, reason: "REVIEW_CASE_NOT_FOUND" });
  });
});
