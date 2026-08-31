import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { CANDIDATE_CLASSIFICATIONS } from "../identity/types";
import { REVIEW_DECISIONS, REVIEW_OUTCOMES, REVIEW_STATES } from "./types";

/**
 * The review unions mirror the enums `prisma/schema.prisma` enforces —
 * value for value and in order — exactly as `../ingestion/types.test.ts`
 * guards the HOR-9 vocabulary. The candidate classification enum reuses the
 * HOR-14 contract from `../identity/types`, so the resolver and the stored
 * snapshot can never drift apart (CASE 8: reason codes and classifications
 * are not redefined by persistence).
 */

const schema = readFileSync(join(__dirname, "..", "..", "prisma", "schema.prisma"), "utf8");

function schemaEnum(name: string): string[] {
  const match = schema.match(new RegExp(String.raw`^enum ${name} \{\r?\n([\s\S]*?)^\}`, "m"));
  if (!match) throw new Error(`enum ${name} not found in schema.prisma`);
  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("//"));
}

describe("review vocabulary mirrors the Prisma schema", () => {
  it("identity_review_outcome matches REVIEW_OUTCOMES exactly", () => {
    expect(schemaEnum("identity_review_outcome")).toEqual([...REVIEW_OUTCOMES]);
  });

  it("identity_review_state matches REVIEW_STATES exactly", () => {
    expect(schemaEnum("identity_review_state")).toEqual([...REVIEW_STATES]);
  });

  it("identity_review_decision matches REVIEW_DECISIONS exactly", () => {
    expect(schemaEnum("identity_review_decision")).toEqual([...REVIEW_DECISIONS]);
  });

  it("identity_candidate_classification matches the HOR-14 contract exactly", () => {
    expect(schemaEnum("identity_candidate_classification")).toEqual([...CANDIDATE_CLASSIFICATIONS]);
  });
});

describe("review outcomes are a strict subset of the resolution outcomes", () => {
  it("contains exactly the two review-material outcomes (CASE 3, CASE 4)", () => {
    expect([...REVIEW_OUTCOMES]).toEqual(["AMBIGUOUS", "CONFLICT"]);
    expect(REVIEW_OUTCOMES).not.toContain("EXISTING_HORSE");
    expect(REVIEW_OUTCOMES).not.toContain("NEW_HORSE");
  });
});
