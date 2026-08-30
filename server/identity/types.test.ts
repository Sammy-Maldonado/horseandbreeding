import { describe, expect, it } from "vitest";

import { IDENTITY_RESOLUTION_OUTCOMES } from "../ingestion/types";
import { CANDIDATE_CLASSIFICATIONS, REASON_CODES, RESOLUTION_OUTCOMES } from "./types";

describe("resolution vocabulary", () => {
  it("uses exactly the persisted identity outcomes except NOT_ATTEMPTED", () => {
    const persisted = IDENTITY_RESOLUTION_OUTCOMES.filter((o) => o !== "NOT_ATTEMPTED");
    expect([...RESOLUTION_OUTCOMES]).toEqual(persisted);
  });

  it("keeps reason codes and classifications unique", () => {
    expect(new Set(REASON_CODES).size).toBe(REASON_CODES.length);
    expect(new Set(CANDIDATE_CLASSIFICATIONS).size).toBe(CANDIDATE_CLASSIFICATIONS.length);
  });
});
