/**
 * Contract of source-family entity resolution (HOR-14, ADR-018 §5).
 *
 * The resolver answers one question per source horse entity: which
 * `storehorse.horse_id`, if any, does this Word-derived horse denote? It
 * never writes — `NEW_HORSE` is a creation proposal for the ingestion write
 * path (HOR-13), `AMBIGUOUS` and `CONFLICT` are review material (HOR-142).
 *
 * Identity evidence is the Word family graph, never the name alone: a name
 * generates candidates; dam, maternal granddam, sire, birth year and sex
 * decide. Every signal has explicit MATCH / MISMATCH / UNKNOWN semantics and
 * UNKNOWN means "no usable evidence" — missing data never rewards a match.
 *
 * Pure: no Prisma, no Nitro, no I/O. The only database-facing piece is the
 * bounded loader in `loadStorehorseRows.ts`, which maps rows into
 * `StorehorseRow` so nothing here depends on column names.
 */
import type { IdentityResolutionOutcome } from "../ingestion/types";

/** The four decidable outcomes — `NOT_ATTEMPTED` belongs to persistence, not to the resolver. */
export const RESOLUTION_OUTCOMES = [
  "EXISTING_HORSE",
  "NEW_HORSE",
  "AMBIGUOUS",
  "CONFLICT",
] as const satisfies readonly IdentityResolutionOutcome[];
export type ResolutionOutcome = (typeof RESOLUTION_OUTCOMES)[number];

export const SIGNAL_STATES = ["MATCH", "MISMATCH", "UNKNOWN"] as const;
export type SignalState = (typeof SIGNAL_STATES)[number];

/** Compared in this order; the order is part of the evidence contract. */
export const IDENTITY_SIGNALS = [
  "DAM",
  "MATERNAL_GRANDDAM",
  "SIRE",
  "BIRTH_YEAR",
  "SEX",
] as const;
export type IdentitySignal = (typeof IDENTITY_SIGNALS)[number];

export const REASON_CODES = [
  /** One name candidate, no independent corroborating signal. */
  "INSUFFICIENT_CORROBORATION",
  /** Several candidates remain viable after family evidence. */
  "MULTIPLE_VIABLE_CANDIDATES",
  /** A confidently asserted parent differs from the candidate's registered parent. */
  "TRUSTED_PARENT_MISMATCH",
  /** A usable birth year or a known sex differs from the candidate's. */
  "TRUSTED_SIGNAL_MISMATCH",
  /** No candidate survives; every same-name row was safely excluded or none exists. */
  "NO_PLAUSIBLE_EXISTING_CANDIDATE",
  /** The source entity is too weak to propose a creation (textual mention, no anchor). */
  "INSUFFICIENT_SOURCE_ESTABLISHMENT",
  /** Two source assertions resolve to the same horse with incompatible facts. */
  "SOURCE_IDENTITY_CONFLICT",
  /** Same horse, stale registry pedigree: canonical data conflict, not an identity failure. */
  "DB_PEDIGREE_CONFLICT",
  /** A source relation was not confidently asserted, so it carried no evidence. */
  "SOURCE_RELATION_AMBIGUOUS",
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

/**
 * Reliability of a source relation. Only `CONFIDENT` relations are evidence;
 * the extractor's ambiguous relations and its unsupported / error nodes map to
 * the other members and are never used as positive identity evidence.
 */
export const SOURCE_RELATION_CONFIDENCES = ["CONFIDENT", "AMBIGUOUS", "UNSUPPORTED", "ERROR"] as const;
export type SourceRelationConfidence = (typeof SOURCE_RELATION_CONFIDENCES)[number];

export const HORSE_SEXES = ["MARE", "STALLION", "GELDING", "UNKNOWN"] as const;
export type HorseSex = (typeof HORSE_SEXES)[number];

/**
 * Where the entity sits in the catalogue. Structured roles can establish a
 * horse; a `TEXT_MENTION` is a preserved source fact, never a creation.
 */
export const SOURCE_STRUCTURAL_ROLES = [
  "LOT_SUBJECT",
  "DAM_SECTION_HEAD",
  "DESCENDANT_RECORD",
  "TEXT_MENTION",
] as const;
export type SourceStructuralRole = (typeof SOURCE_STRUCTURAL_ROLES)[number];

export const CANDIDATE_CLASSIFICATIONS = [
  /** ≥1 corroboration, 0 contradictions. */
  "SUPPORTED",
  /** ≥2 corroborations outweighing ≥1 contradiction — identity holds, registry data is stale. */
  "CONFLICTED_SUPPORTED",
  /** Corroborated and contradicted without a clear majority — not safe either way. */
  "MIXED",
  /** No usable evidence at all. */
  "NEUTRAL",
  /** 0 corroborations, exactly 1 contradiction — rejected, but not safely excluded. */
  "CONTRADICTED",
  /** 0 corroborations, ≥2 independent contradictions — safely excluded. */
  "EXCLUDED",
] as const;
export type CandidateClassification = (typeof CANDIDATE_CLASSIFICATIONS)[number];

export const ESTABLISHMENT_ANCHORS = [
  "RELIABLE_DAM",
  "RELIABLE_SIRE",
  "USABLE_BIRTH_YEAR",
  "RECURRENCE",
] as const;
export type EstablishmentAnchor = (typeof ESTABLISHMENT_ANCHORS)[number];

/** Enough to find the assertion again; the ingestion model owns the rest of the provenance. */
export interface SourceProvenanceRef {
  documentId: string;
  nodeId: string;
}

/** A parent as the catalogue asserts it, with the reliability of the relation itself. */
export interface SourceParentAssertion {
  name: string;
  confidence: SourceRelationConfidence;
}

/**
 * Minimal input decoupled from DOCX parsing (HOR-12 owns extraction). Missing
 * values are explicit: `null` means the source says nothing, `UNKNOWN` sex
 * means the same. The extractor emits no sex today, so callers pass `UNKNOWN`.
 */
export interface SourceHorseEntity {
  sourceId: string;
  provenance: SourceProvenanceRef;
  name: string | null;
  birthYear: number | null;
  sex: HorseSex;
  sire: SourceParentAssertion | null;
  dam: SourceParentAssertion | null;
  maternalGranddam: SourceParentAssertion | null;
  structuralRole: SourceStructuralRole;
  /** Times this entity was observed across the batch (structural recurrence, ≥ 1). */
  occurrenceCount: number;
}

/**
 * One registry row as the resolver sees it. Raw sentinel values survive on
 * purpose (`birthYear` 0, `sireId` / `damId` 0 or null mean unknown) and are
 * interpreted by the signal rules, not by the loader.
 */
export interface StorehorseRow {
  horseId: number;
  name: string;
  birthYear: number;
  sireId: number | null;
  damId: number | null;
  sex: HorseSex;
}

export interface SignalEvidence {
  signal: IdentitySignal;
  state: SignalState;
  sourceValue: string | null;
  candidateValue: string | null;
  /** Why an UNKNOWN carried no evidence, when a reason exists. */
  note?: ReasonCode;
}

export interface CandidateEvaluation {
  horseId: number;
  name: string;
  classification: CandidateClassification;
  signals: SignalEvidence[];
  corroborations: IdentitySignal[];
  contradictions: IdentitySignal[];
  rejectionReasons: ReasonCode[];
}

export interface CanonicalDataConflict {
  horseId: number;
  signal: IdentitySignal;
  sourceValue: string | null;
  canonicalValue: string | null;
  reason: "DB_PEDIGREE_CONFLICT";
}

export interface SourceIdentityConflict {
  otherSourceId: string;
  otherProvenance: SourceProvenanceRef;
  /** The registry horse both assertions resolved to before the conflict was detected. */
  horseId: number;
  signal: IdentitySignal;
  thisValue: string | null;
  otherValue: string | null;
}

export interface EstablishmentEvidence {
  structuralRole: SourceStructuralRole;
  anchors: EstablishmentAnchor[];
  wellEstablished: boolean;
}

/** What HOR-13 may create — source-derived facts only, never inserted here. */
export interface CreationProposal {
  name: string;
  birthYear: number | null;
  sex: HorseSex;
  sireName: string | null;
  damName: string | null;
  maternalGranddamName: string | null;
}

export interface ResolutionResult {
  sourceId: string;
  provenance: SourceProvenanceRef;
  outcome: ResolutionOutcome;
  /** Set only for `EXISTING_HORSE`. */
  horseId: number | null;
  reasonCodes: ReasonCode[];
  nameKey: string | null;
  candidates: CandidateEvaluation[];
  canonicalDataConflicts: CanonicalDataConflict[];
  sourceConflicts: SourceIdentityConflict[];
  creationProposal: CreationProposal | null;
  establishment: EstablishmentEvidence;
}
