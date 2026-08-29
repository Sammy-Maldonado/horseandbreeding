import { describe, expect, it } from "vitest";

import { mapResultKind, toCompetitionHistoryRecord } from "./competitionResult";

const RESULT = {
  year: 2021,
  placing: "2nd",
  placing_kind: "placed",
  detail: "Grand Prix",
  raw: "2021: 2nd Grand Prix 1.45m",
  offset: 12,
  status: "PARSED",
} as const;

const SUBJECT = {
  name: "HORSE_ALPHA",
  name_raw: "HORSE_ALPHA",
  rider: "Rider Synthetic",
  country: "NL",
  level: { code: "1.45", raw: "1.45m", height_m: 1.45, stars: null, modifier: null },
} as const;

describe("mapResultKind", () => {
  it.each([
    ["placed", "PLACED"],
    ["won", "WON"],
    ["competed", "COMPETED"],
  ] as const)("maps extractor placing kind %s to %s", (placingKind, resultKind) => {
    expect(mapResultKind(placingKind)).toEqual({ ok: true, resultKind });
  });

  it("maps an absent placing kind to no result kind, not to a guess", () => {
    expect(mapResultKind(null)).toEqual({ ok: true, resultKind: null });
  });

  it("rejects an unknown vocabulary value instead of dropping it", () => {
    expect(mapResultKind("qualified")).toEqual({ ok: false, reason: "UNKNOWN_PLACING_KIND" });
  });
});

describe("toCompetitionHistoryRecord", () => {
  const input = {
    result: RESULT,
    subject: SUBJECT,
    horseId: 1003,
    ingestionRunId: 7,
    persistenceState: "CANONICALISED_STRUCTURED",
  } as const;

  it("fills the legacy columns and the structured columns from one extracted result", () => {
    expect(toCompetitionHistoryRecord(input)).toEqual({
      ok: true,
      record: {
        horse_name: "HORSE_ALPHA",
        storehorse_id: 1003,
        rider: "Rider Synthetic",
        competition_year: 2021,
        location: null,
        csi: null,
        type: null,
        height: 1.45,
        placed_in_competition: "2nd",
        detail: "Grand Prix",
        discipline_code: null,
        result_kind: "PLACED",
        event_name: null,
        level_code: "1.45",
        participation: null,
        country_code: "NL",
        raw_source_segment: "2021: 2nd Grand Prix 1.45m",
        ingestion_run_id: 7,
        canonicalisation_state: "CANONICALISED_STRUCTURED",
      },
    });
  });

  it("keeps storehorse_id NULL for an unresolved horse and still keeps the raw segment", () => {
    const record = toCompetitionHistoryRecord({
      ...input,
      horseId: null,
      persistenceState: "PRESERVED_SOURCE_FACT",
    });

    expect(record).toMatchObject({
      ok: true,
      record: {
        storehorse_id: null,
        horse_name: "HORSE_ALPHA",
        raw_source_segment: RESULT.raw,
        canonicalisation_state: "PRESERVED_SOURCE_FACT",
      },
    });
  });

  it("leaves level, rider and country NULL when the subject has none", () => {
    const record = toCompetitionHistoryRecord({
      ...input,
      subject: { name: "MARE_BETA", name_raw: "MARE_BETA", rider: null, country: null, level: null },
    });

    expect(record).toMatchObject({
      ok: true,
      record: { height: null, level_code: null, rider: null, country_code: null },
    });
  });

  it("never truncates: a value wider than its legacy column is rejected, not cut", () => {
    expect(
      toCompetitionHistoryRecord({ ...input, result: { ...RESULT, placing: "x".repeat(51) } }),
    ).toEqual({ ok: false, reason: "PLACING_TOO_LONG" });
    expect(
      toCompetitionHistoryRecord({ ...input, result: { ...RESULT, detail: "x".repeat(256) } }),
    ).toEqual({ ok: false, reason: "DETAIL_TOO_LONG" });
    expect(
      toCompetitionHistoryRecord({ ...input, subject: { ...SUBJECT, country: "NLD1" } }),
    ).toEqual({ ok: false, reason: "COUNTRY_TOO_LONG" });
  });

  it("rejects a result that is not PARSED: it belongs in the assertion ledger, not in this table", () => {
    expect(
      toCompetitionHistoryRecord({ ...input, result: { ...RESULT, status: "PRESERVED_UNPARSED" } }),
    ).toEqual({ ok: false, reason: "RESULT_NOT_PARSED" });
  });

  it("rejects an unknown placing kind and an invalid year", () => {
    expect(
      toCompetitionHistoryRecord({ ...input, result: { ...RESULT, placing_kind: "qualified" } }),
    ).toEqual({ ok: false, reason: "UNKNOWN_PLACING_KIND" });
    expect(
      toCompetitionHistoryRecord({ ...input, result: { ...RESULT, year: 21 } }),
    ).toEqual({ ok: false, reason: "INVALID_YEAR" });
  });

  it("rejects an invalid horse id rather than writing a wrong relation", () => {
    expect(toCompetitionHistoryRecord({ ...input, horseId: 0 })).toEqual({
      ok: false,
      reason: "INVALID_HORSE_ID",
    });
  });
});
