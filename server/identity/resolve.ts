/**
 * Outcome decision for source-family entity resolution (HOR-14, ADR-018 §5).
 *
 * Precision first. `EXISTING_HORSE` needs one candidate that the family
 * evidence supports and nothing that competes with it; `NEW_HORSE` needs a
 * well-established source horse and the safe exclusion of every namesake;
 * everything else is `AMBIGUOUS` for human review, with the reason attached.
 * No tie-break ever selects among viable candidates — not lowest id, not
 * first row, not "most fields filled".
 *
 * `resolveSourceEntities` adds the Word-versus-Word check: two assertions
 * that resolve to the same registry horse while asserting incompatible
 * facts about it are both returned as `CONFLICT`, each pointing at the
 * other. Batch de-duplication of `NEW_HORSE` proposals (the same new horse
 * printed in several lots) belongs to the ingestion write path (HOR-13).
 *
 * Pure and deterministic: same entities and same registry rows give the same
 * results whatever the load or input order.
 */
import { evaluateCandidate } from "./evaluate";
import { horseNameKey, normaliseHorseName } from "./nameKey";
import { usableBirthYear } from "./signals";
import type { StorehorseIndex } from "./storehorseIndex";
import {
  IDENTITY_SIGNALS,
  type CandidateEvaluation,
  type CanonicalDataConflict,
  type CreationProposal,
  type EstablishmentAnchor,
  type EstablishmentEvidence,
  type IdentitySignal,
  type ReasonCode,
  type ResolutionOutcome,
  type ResolutionResult,
  type SourceHorseEntity,
  type SourceIdentityConflict,
  type SourceParentAssertion,
} from "./types";

function reliableParentKey(parent: SourceParentAssertion | null): string | null {
  if (!parent || parent.confidence !== "CONFIDENT") return null;
  return horseNameKey(parent.name);
}

function reliableParentName(parent: SourceParentAssertion | null): string | null {
  return reliableParentKey(parent) === null ? null : normaliseHorseName(parent!.name);
}

export function assessEstablishment(entity: SourceHorseEntity): EstablishmentEvidence {
  const anchors: EstablishmentAnchor[] = [];
  if (reliableParentKey(entity.dam) !== null) anchors.push("RELIABLE_DAM");
  if (reliableParentKey(entity.sire) !== null) anchors.push("RELIABLE_SIRE");
  if (usableBirthYear(entity.birthYear) !== null) anchors.push("USABLE_BIRTH_YEAR");
  if (entity.occurrenceCount >= 2) anchors.push("RECURRENCE");

  const wellEstablished =
    horseNameKey(entity.name) !== null &&
    entity.structuralRole !== "TEXT_MENTION" &&
    anchors.length > 0;

  return { structuralRole: entity.structuralRole, anchors, wellEstablished };
}

function creationProposalFor(entity: SourceHorseEntity): CreationProposal {
  return {
    name: normaliseHorseName(entity.name),
    birthYear: usableBirthYear(entity.birthYear),
    sex: entity.sex,
    sireName: reliableParentName(entity.sire),
    damName: reliableParentName(entity.dam),
    maternalGranddamName: reliableParentName(entity.maternalGranddam),
  };
}

function canonicalDataConflictsOf(candidate: CandidateEvaluation): CanonicalDataConflict[] {
  return candidate.signals
    .filter((s) => s.state === "MISMATCH")
    .map((s) => ({
      horseId: candidate.horseId,
      signal: s.signal,
      sourceValue: s.sourceValue,
      canonicalValue: s.candidateValue,
      reason: "DB_PEDIGREE_CONFLICT",
    }));
}

interface Decision {
  outcome: ResolutionOutcome;
  horseId: number | null;
  reasonCodes: ReasonCode[];
  canonicalDataConflicts: CanonicalDataConflict[];
  creationProposal: CreationProposal | null;
}

function ambiguous(reasonCodes: ReasonCode[]): Decision {
  return { outcome: "AMBIGUOUS", horseId: null, reasonCodes, canonicalDataConflicts: [], creationProposal: null };
}

function decide(
  entity: SourceHorseEntity,
  candidates: readonly CandidateEvaluation[],
  establishment: EstablishmentEvidence,
): Decision {
  const of = (classification: CandidateEvaluation["classification"]) =>
    candidates.filter((c) => c.classification === classification);
  const competing = [...of("SUPPORTED"), ...of("CONFLICTED_SUPPORTED"), ...of("MIXED")];
  const undecided = [...of("NEUTRAL"), ...of("CONTRADICTED")];

  if (competing.length >= 2) {
    return ambiguous(["MULTIPLE_VIABLE_CANDIDATES"]);
  }

  if (competing.length === 1) {
    const [candidate] = competing;
    if (candidate.classification === "SUPPORTED") {
      return {
        outcome: "EXISTING_HORSE",
        horseId: candidate.horseId,
        reasonCodes: [],
        canonicalDataConflicts: [],
        creationProposal: null,
      };
    }
    if (undecided.length > 0) {
      return ambiguous(["MULTIPLE_VIABLE_CANDIDATES"]);
    }
    if (candidate.classification === "CONFLICTED_SUPPORTED") {
      return {
        outcome: "EXISTING_HORSE",
        horseId: candidate.horseId,
        reasonCodes: ["DB_PEDIGREE_CONFLICT"],
        canonicalDataConflicts: canonicalDataConflictsOf(candidate),
        creationProposal: null,
      };
    }
    return ambiguous(["INSUFFICIENT_CORROBORATION", ...candidate.rejectionReasons]);
  }

  if (undecided.length >= 2) {
    return ambiguous(["MULTIPLE_VIABLE_CANDIDATES"]);
  }
  if (undecided.length === 1) {
    const [candidate] = undecided;
    return ambiguous(
      candidate.classification === "NEUTRAL" ? ["INSUFFICIENT_CORROBORATION"] : [...candidate.rejectionReasons],
    );
  }

  if (!establishment.wellEstablished) {
    return ambiguous(["NO_PLAUSIBLE_EXISTING_CANDIDATE", "INSUFFICIENT_SOURCE_ESTABLISHMENT"]);
  }
  return {
    outcome: "NEW_HORSE",
    horseId: null,
    reasonCodes: ["NO_PLAUSIBLE_EXISTING_CANDIDATE"],
    canonicalDataConflicts: [],
    creationProposal: creationProposalFor(entity),
  };
}

export function resolveSourceEntity(entity: SourceHorseEntity, index: StorehorseIndex): ResolutionResult {
  const establishment = assessEstablishment(entity);
  const nameKey = horseNameKey(entity.name);
  const provenance = { ...entity.provenance };

  if (nameKey === null) {
    return {
      sourceId: entity.sourceId,
      provenance,
      outcome: "AMBIGUOUS",
      horseId: null,
      reasonCodes: ["INSUFFICIENT_SOURCE_ESTABLISHMENT"],
      nameKey,
      candidates: [],
      canonicalDataConflicts: [],
      sourceConflicts: [],
      creationProposal: null,
      establishment,
    };
  }

  const candidates = index.candidatesByNameKey(nameKey).map((row) => evaluateCandidate(entity, row, index));
  const decision = decide(entity, candidates, establishment);

  return {
    sourceId: entity.sourceId,
    provenance,
    ...decision,
    nameKey,
    candidates,
    sourceConflicts: [],
    establishment,
  };
}

interface AssertedValue {
  signal: IdentitySignal;
  key: string;
  display: string;
}

/** What a source entity asserts firmly enough to contradict another assertion. */
function assertedValues(entity: SourceHorseEntity): AssertedValue[] {
  const values: AssertedValue[] = [];
  const parents: Array<[IdentitySignal, SourceParentAssertion | null]> = [
    ["DAM", entity.dam],
    ["MATERNAL_GRANDDAM", entity.maternalGranddam],
    ["SIRE", entity.sire],
  ];
  for (const [signal, parent] of parents) {
    const key = reliableParentKey(parent);
    if (key !== null) values.push({ signal, key, display: normaliseHorseName(parent!.name) });
  }
  const year = usableBirthYear(entity.birthYear);
  if (year !== null) values.push({ signal: "BIRTH_YEAR", key: String(year), display: String(year) });
  if (entity.sex !== "UNKNOWN") values.push({ signal: "SEX", key: entity.sex, display: entity.sex });
  return values;
}

function incompatibleAssertions(a: SourceHorseEntity, b: SourceHorseEntity): Array<[AssertedValue, AssertedValue]> {
  const byB = new Map(assertedValues(b).map((v) => [v.signal, v]));
  const pairs: Array<[AssertedValue, AssertedValue]> = [];
  for (const av of assertedValues(a)) {
    const bv = byB.get(av.signal);
    if (bv && bv.key !== av.key) pairs.push([av, bv]);
  }
  return pairs;
}

function bySourceThenSignal(x: SourceIdentityConflict, y: SourceIdentityConflict): number {
  if (x.otherSourceId !== y.otherSourceId) return x.otherSourceId < y.otherSourceId ? -1 : 1;
  return IDENTITY_SIGNALS.indexOf(x.signal) - IDENTITY_SIGNALS.indexOf(y.signal);
}

export function resolveSourceEntities(
  entities: readonly SourceHorseEntity[],
  index: StorehorseIndex,
): ResolutionResult[] {
  const results = entities.map((entity) => resolveSourceEntity(entity, index));

  const resolvedTo = new Map<number, number[]>();
  results.forEach((result, position) => {
    if (result.outcome !== "EXISTING_HORSE" || result.horseId === null) return;
    const group = resolvedTo.get(result.horseId);
    if (group) group.push(position);
    else resolvedTo.set(result.horseId, [position]);
  });

  const conflicts = new Map<number, SourceIdentityConflict[]>();
  const record = (position: number, conflict: SourceIdentityConflict) => {
    const list = conflicts.get(position);
    if (list) list.push(conflict);
    else conflicts.set(position, [conflict]);
  };

  for (const [horseId, positions] of resolvedTo) {
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = entities[positions[i]];
        const b = entities[positions[j]];
        for (const [av, bv] of incompatibleAssertions(a, b)) {
          record(positions[i], {
            otherSourceId: b.sourceId,
            otherProvenance: { ...b.provenance },
            horseId,
            signal: av.signal,
            thisValue: av.display,
            otherValue: bv.display,
          });
          record(positions[j], {
            otherSourceId: a.sourceId,
            otherProvenance: { ...a.provenance },
            horseId,
            signal: bv.signal,
            thisValue: bv.display,
            otherValue: av.display,
          });
        }
      }
    }
  }

  return results.map((result, position) => {
    const sourceConflicts = conflicts.get(position);
    if (!sourceConflicts) return result;
    return {
      ...result,
      outcome: "CONFLICT",
      horseId: null,
      reasonCodes: ["SOURCE_IDENTITY_CONFLICT"],
      canonicalDataConflicts: [],
      creationProposal: null,
      sourceConflicts: [...sourceConflicts].sort(bySourceThenSignal),
    };
  });
}
