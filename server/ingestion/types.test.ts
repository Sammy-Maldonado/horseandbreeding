import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  COMPETITION_PARTICIPATIONS,
  COMPETITION_RESULT_KINDS,
  EXTRACTOR_ACCOUNTING_STATUSES,
  IDENTITY_RESOLUTION_OUTCOMES,
  INGESTION_PERSISTENCE_STATES,
  SOURCE_ASSERTION_KINDS,
  WRITEUP_LIFECYCLE_STATES,
} from "./types";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const schema = readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8");
const extractorModel = readFileSync(
  join(ROOT, "extractor", "maternal_line", "model.py"),
  "utf8",
);

function schemaEnum(name: string): string[] {
  const match = schema.match(new RegExp(String.raw`^enum ${name} \{([\s\S]*?)^\}`, "m"));
  if (!match) throw new Error(`enum ${name} not found in prisma/schema.prisma`);
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"));
}

function extractorAccountingStatuses(): string[] {
  const match = extractorModel.match(/ACCOUNTING_STATUSES = \(([\s\S]*?)\)/);
  if (!match) throw new Error("ACCOUNTING_STATUSES not found in extractor model.py");
  return match[1]
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

describe("ingestion vocabulary contract", () => {
  // The TypeScript unions are the persistence vocabulary the application
  // writes. They must be exactly the enums the database enforces — a drift
  // here would be a silent runtime failure on insert.
  it.each([
    ["ingestion_persistence_state", INGESTION_PERSISTENCE_STATES],
    ["identity_resolution_outcome", IDENTITY_RESOLUTION_OUTCOMES],
    ["source_assertion_kind", SOURCE_ASSERTION_KINDS],
    ["writeup_lifecycle_state", WRITEUP_LIFECYCLE_STATES],
    ["competition_result_kind", COMPETITION_RESULT_KINDS],
    ["competition_participation", COMPETITION_PARTICIPATIONS],
  ] as const)("%s matches the Prisma enum exactly", (enumName, values) => {
    expect([...values]).toEqual(schemaEnum(enumName));
  });

  it("mirrors the extractor accounting statuses exactly", () => {
    expect([...EXTRACTOR_ACCOUNTING_STATUSES]).toEqual(extractorAccountingStatuses());
  });

  it("carries the seven zero-loss states of ADR-018", () => {
    expect([...INGESTION_PERSISTENCE_STATES]).toEqual([
      "CANONICALISED_STRUCTURED",
      "CANONICALISED_RELATIONSHIP",
      "PRESERVED_SOURCE_FACT",
      "AMBIGUOUS",
      "CONFLICT",
      "EXPLICITLY_UNSUPPORTED",
      "ERROR",
    ]);
  });
});
