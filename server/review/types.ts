/**
 * Contract of durable identity review persistence (HOR-142, ADR-018 §5).
 *
 * A review case is the persisted form of a HOR-14 resolution a human must
 * settle: AMBIGUOUS and CONFLICT only — EXISTING_HORSE and NEW_HORSE never
 * open one. The case snapshots the resolver's decision-time evidence
 * (candidates, per-signal states, reason codes, conflicts, establishment)
 * and references the originating `source_assertion` by its durable key; the
 * raw Word text stays in the ledger and is never duplicated here.
 *
 * The three review unions mirror, value for value and in order, the enums
 * `prisma/schema.prisma` enforces (`types.test.ts` guards the mirror), and
 * candidate classifications reuse the HOR-14 vocabulary from
 * `../identity/types` — one contract, no second manually maintained copy.
 * No Prisma, no Nitro, no database here.
 */
import type {
  CandidateClassification,
  EstablishmentEvidence,
  IdentitySignal,
  ReasonCode,
  SignalEvidence,
  SourceIdentityConflict,
} from "../identity/types";

/** The only outcomes that are review material (automation-mvp FR-004). */
export const REVIEW_OUTCOMES = ["AMBIGUOUS", "CONFLICT"] as const;
export type ReviewOutcome = (typeof REVIEW_OUTCOMES)[number];

/** Minimal lifecycle: a case is open until a human decides it. */
export const REVIEW_STATES = ["OPEN", "DECIDED"] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

/**
 * The decisions the Linear acceptance criteria name. Approving a NEW_HORSE
 * only records the approval — the creation itself executes later under the
 * safe source-derived contract of ADR-018, never inside HOR-142.
 */
export const REVIEW_DECISIONS = [
  "ASSIGNED_EXISTING_HORSE",
  "APPROVED_NEW_HORSE",
  "KEPT_TEXT_ONLY",
  "REJECTED",
] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

/**
 * Version tag of the resolver rules a snapshot was produced under
 * (docs/domain/writeup-grammar.md §7.1). Part of the idempotency key, so a
 * future rules revision re-reviews under a new case instead of silently
 * overwriting evidence produced by the old rules.
 */
export const RESOLVER_CONTRACT_VERSION = "hor14-v1";

/**
 * One candidate as evaluated at decision time. `candidateName` is a snapshot
 * of the registry name when the resolver ran — evidence for the reviewer —
 * while `horseId` is the reference to the current canonical horse.
 * `candidateOrder` is deterministic presentation order (ascending horse id);
 * it never encodes a preference or a selection.
 */
export interface ReviewCandidateSnapshot {
  horseId: number;
  candidateName: string;
  candidateOrder: number;
  classification: CandidateClassification;
  signals: SignalEvidence[];
  corroborations: IdentitySignal[];
  contradictions: IdentitySignal[];
  rejectionReasons: ReasonCode[];
}

/** Everything the repository persists for one review case. */
export interface ReviewCaseInput {
  reviewCaseKey: string;
  /** Durable key of the originating `source_assertion` — never a document name. */
  assertionKey: string;
  outcome: ReviewOutcome;
  nameKey: string | null;
  reasonCodes: ReasonCode[];
  candidates: ReviewCandidateSnapshot[];
  /** Both sides of a Word-versus-Word conflict, with their provenance refs. */
  sourceConflicts: SourceIdentityConflict[];
  establishment: EstablishmentEvidence;
  resolverContractVersion: string;
}
