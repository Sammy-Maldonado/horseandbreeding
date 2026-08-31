/**
 * Repository of durable identity review cases (HOR-142, ADR-018 §5, §11).
 *
 * One atomic transaction per batch: align the originating `source_assertion`
 * with the zero-loss rules (`resolution_outcome` and `persistence_state`
 * become AMBIGUOUS / CONFLICT — reusing `derivePersistenceState`, never a
 * second vocabulary), create the review case and its candidate snapshots.
 * Any failure rolls the whole batch back — no partial review persistence.
 *
 * Idempotent by construction: the deterministic `review_case_key` makes a
 * re-persisted outcome land on the existing case, which is then left
 * untouched — evidence, review state and any human decision survive retries.
 *
 * The client surface is the narrowest slice of the Prisma contract this
 * repository needs (the boundary approach of `storehorse-compat.ts`), and it
 * contains no `storehorse` delegate at all: this module structurally cannot
 * insert or update a horse. Recording a decision updates decision fields
 * only — original evidence is never rewritten and never deleted.
 */
import { derivePersistenceState, validateAssertionLinks } from "../ingestion/persistenceState";
import type {
  IdentityResolutionOutcome,
  IngestionPersistenceState,
  SourceAssertionKind,
} from "../ingestion/types";
import type {
  CandidateClassification,
  EstablishmentEvidence,
  IdentitySignal,
  ReasonCode,
  SignalEvidence,
  SourceIdentityConflict,
} from "../identity/types";
import { validateReviewDecision, type ReviewDecisionInput, type ReviewDecisionValidation } from "./decision";
import type { ReviewCaseInput, ReviewDecision, ReviewOutcome, ReviewState } from "./types";

/** The columns of `source_assertion` this repository reads and writes. */
export interface StoredSourceAssertion {
  source_assertion_id: number;
  assertion_key: string;
  assertion_kind: SourceAssertionKind;
  persistence_state: IngestionPersistenceState;
  resolution_outcome: IdentityResolutionOutcome;
  horse_id: number | null;
}

export interface StoredReviewCase {
  identity_review_case_id: number;
  review_case_key: string;
  source_assertion_id: number;
  outcome: ReviewOutcome;
  name_key: string | null;
  reason_codes: ReasonCode[];
  source_conflicts: SourceIdentityConflict[];
  establishment: EstablishmentEvidence;
  resolver_contract_version: string;
  review_state: ReviewState;
  decision: ReviewDecision | null;
  decided_horse_id: number | null;
  decided_by: string | null;
  decided_at: Date | null;
  decision_note: string | null;
}

export interface StoredReviewCandidate {
  identity_review_candidate_id: number;
  identity_review_case_id: number;
  horse_id: number;
  candidate_order: number;
  candidate_name: string;
  classification: CandidateClassification;
  signals: SignalEvidence[];
  corroborations: IdentitySignal[];
  contradictions: IdentitySignal[];
  rejection_reasons: ReasonCode[];
}

/**
 * Transaction-scoped client surface. Deliberately without a `storehorse`
 * delegate — review persistence has no way to create or mutate a horse.
 */
export interface ReviewTransactionClient {
  source_assertion: {
    findUnique(args: { where: { assertion_key: string } }): Promise<StoredSourceAssertion | null>;
    update(args: {
      where: { source_assertion_id: number };
      data: {
        resolution_outcome: IdentityResolutionOutcome;
        persistence_state: IngestionPersistenceState;
      };
    }): Promise<StoredSourceAssertion>;
  };
  identity_review_case: {
    findUnique(args: { where: { review_case_key: string } }): Promise<StoredReviewCase | null>;
    create(args: { data: Omit<StoredReviewCase, "identity_review_case_id"> }): Promise<StoredReviewCase>;
    update(args: {
      where: { review_case_key: string };
      data: Partial<
        Pick<
          StoredReviewCase,
          "review_state" | "decision" | "decided_horse_id" | "decided_by" | "decided_at" | "decision_note"
        >
      >;
    }): Promise<StoredReviewCase>;
  };
  identity_review_candidate: {
    create(args: { data: Omit<StoredReviewCandidate, "identity_review_candidate_id"> }): Promise<StoredReviewCandidate>;
  };
}

export interface ReviewPersistenceClient {
  $transaction<T>(fn: (tx: ReviewTransactionClient) => Promise<T>): Promise<T>;
}

export type PersistedReviewStatus = "CREATED" | "ALREADY_PERSISTED";

export type PersistReviewResult =
  | { ok: true; results: Array<{ reviewCaseKey: string; status: PersistedReviewStatus }> }
  | { ok: false; reason: "MISSING_SOURCE_ASSERTION"; assertionKey: string }
  | { ok: false; reason: "INVALID_ASSERTION_LINKS"; assertionKey: string; detail: string };

/** Internal marker: aborts the transaction, then surfaces as a typed rejection. */
class TransactionRejection<T> extends Error {
  constructor(readonly rejection: T) {
    super("review transaction rejected");
    this.name = "TransactionRejection";
  }
}

export async function persistReviewCases(
  client: ReviewPersistenceClient,
  inputs: readonly ReviewCaseInput[],
): Promise<PersistReviewResult> {
  type Rejection = Exclude<PersistReviewResult, { ok: true }>;
  try {
    const results = await client.$transaction(async (tx) => {
      const persisted: Array<{ reviewCaseKey: string; status: PersistedReviewStatus }> = [];

      for (const input of inputs) {
        const assertion = await tx.source_assertion.findUnique({
          where: { assertion_key: input.assertionKey },
        });
        if (!assertion) {
          throw new TransactionRejection<Rejection>({
            ok: false,
            reason: "MISSING_SOURCE_ASSERTION",
            assertionKey: input.assertionKey,
          });
        }

        const persistenceState = derivePersistenceState({
          accountingStatus: "PARSED",
          assertionKind: assertion.assertion_kind,
          resolutionOutcome: input.outcome,
        });
        const links = validateAssertionLinks({
          persistenceState,
          resolutionOutcome: input.outcome,
          horseId: assertion.horse_id,
        });
        if (!links.ok) {
          throw new TransactionRejection<Rejection>({
            ok: false,
            reason: "INVALID_ASSERTION_LINKS",
            assertionKey: input.assertionKey,
            detail: links.reason,
          });
        }

        const existing = await tx.identity_review_case.findUnique({
          where: { review_case_key: input.reviewCaseKey },
        });
        if (existing) {
          persisted.push({ reviewCaseKey: input.reviewCaseKey, status: "ALREADY_PERSISTED" });
          continue;
        }

        await tx.source_assertion.update({
          where: { source_assertion_id: assertion.source_assertion_id },
          data: { resolution_outcome: input.outcome, persistence_state: persistenceState },
        });

        const created = await tx.identity_review_case.create({
          data: {
            review_case_key: input.reviewCaseKey,
            source_assertion_id: assertion.source_assertion_id,
            outcome: input.outcome,
            name_key: input.nameKey,
            reason_codes: input.reasonCodes,
            source_conflicts: input.sourceConflicts,
            establishment: input.establishment,
            resolver_contract_version: input.resolverContractVersion,
            review_state: "OPEN",
            decision: null,
            decided_horse_id: null,
            decided_by: null,
            decided_at: null,
            decision_note: null,
          },
        });

        for (const candidate of input.candidates) {
          await tx.identity_review_candidate.create({
            data: {
              identity_review_case_id: created.identity_review_case_id,
              horse_id: candidate.horseId,
              candidate_order: candidate.candidateOrder,
              candidate_name: candidate.candidateName,
              classification: candidate.classification,
              signals: candidate.signals,
              corroborations: candidate.corroborations,
              contradictions: candidate.contradictions,
              rejection_reasons: candidate.rejectionReasons,
            },
          });
        }

        persisted.push({ reviewCaseKey: input.reviewCaseKey, status: "CREATED" });
      }

      return persisted;
    });
    return { ok: true, results };
  } catch (error) {
    if (error instanceof TransactionRejection) return error.rejection as PersistReviewResult;
    throw error;
  }
}

export type RecordReviewDecisionResult =
  | { ok: true; reviewCase: StoredReviewCase }
  | Exclude<ReviewDecisionValidation, { ok: true }>
  | { ok: false; reason: "REVIEW_CASE_NOT_FOUND" };

/**
 * Records a human decision on an existing case: decision fields only, never
 * the evidence. The original snapshot — candidates, signals, reason codes,
 * conflicts — survives every decision (automation-mvp FR-004: resolution
 * without deleting the originally persisted evidence).
 */
export async function recordReviewDecision(
  client: ReviewPersistenceClient,
  input: { reviewCaseKey: string } & ReviewDecisionInput,
): Promise<RecordReviewDecisionResult> {
  const validation = validateReviewDecision(input);
  if (!validation.ok) return validation;

  try {
    const reviewCase = await client.$transaction(async (tx) => {
      const existing = await tx.identity_review_case.findUnique({
        where: { review_case_key: input.reviewCaseKey },
      });
      if (!existing) {
        throw new TransactionRejection<{ ok: false; reason: "REVIEW_CASE_NOT_FOUND" }>({
          ok: false,
          reason: "REVIEW_CASE_NOT_FOUND",
        });
      }
      return tx.identity_review_case.update({
        where: { review_case_key: input.reviewCaseKey },
        data: {
          review_state: "DECIDED",
          decision: input.decision,
          decided_horse_id: input.decidedHorseId,
          decided_by: input.decidedBy,
          decided_at: input.decidedAt,
          decision_note: input.decisionNote,
        },
      });
    });
    return { ok: true, reviewCase };
  } catch (error) {
    if (error instanceof TransactionRejection) {
      return error.rejection as { ok: false; reason: "REVIEW_CASE_NOT_FOUND" };
    }
    throw error;
  }
}
