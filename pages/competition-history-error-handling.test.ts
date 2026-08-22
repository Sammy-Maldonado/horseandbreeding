import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * HOR-108 — how the two horse-detail pages handle a failed `POST /api/horse`.
 *
 * `getCompetitionHistory` was copied out of `pages/report.vue`'s `fetchHorse`
 * without the state that function owns. `report.vue` declares `const error =
 * ref(null)` and `const pending = ref(false)`; the copies kept the *uses* and
 * dropped the *declarations*, commenting out two of them and leaving the third
 * live:
 *
 *   if (fetchError.value) {
 *     error.value = fetchError.value;   // `error` was never declared here
 *   }
 *
 * Under module semantics that reads an undeclared binding, so the branch threw
 * `ReferenceError: error is not defined` inside the `try` and the `catch` below
 * swallowed it. The real failure — the status the server actually sent — was
 * destroyed and replaced by the page's own bug, which is the defect: a
 * client-side handling failure turned one failure into a different one.
 *
 * `error` had no consumer to route a failure to. It is not rendered in either
 * page's template, and it is not rendered in `report.vue`'s template either,
 * where it *is* declared — so the state was never a surface anywhere in this
 * family. The branch was therefore dropped rather than wired up; inventing an
 * error UI is a product decision this issue does not own.
 *
 * These tests run the pages' own source. The block is lifted verbatim from each
 * `<script setup>` and executed under `"use strict"` — the semantics an SFC
 * compiles to — with `useFetch` stubbed. No Nuxt, no network, no database, and
 * nothing about the assertions can drift away from what the pages actually ship.
 */

const pages = [
  ["pages/PremiumHorseDetail/[id].vue", "./PremiumHorseDetail/[id].vue"],
  ["pages/premium-horse-detail1/[id].vue", "./premium-horse-detail1/[id].vue"]
] as const;

/** The competition-history block, from its state declaration to its call. */
const BLOCK_START = "const _competitionHistory = ref([]);";
const BLOCK_END = "getCompetitionHistory();";

const blockOf = (relative: string): string => {
  const source = readFileSync(
    fileURLToPath(new URL(relative, import.meta.url)),
    "utf8"
  );
  const from = source.indexOf(BLOCK_START);
  const to = source.indexOf(BLOCK_END, from);

  expect(from).toBeGreaterThan(-1);
  expect(to).toBeGreaterThan(from);

  return source.slice(from, to);
};

/** The block with its comments removed, so a comment is never read as code. */
const codeOf = (block: string): string =>
  block.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

interface Ref<T> {
  value: T;
}

interface Harness {
  getCompetitionHistory: () => Promise<void>;
  _competitionHistory: Ref<unknown>;
  /** Every argument list the block passed to `console.log`. */
  logged: unknown[][];
}

/**
 * Compiles the page's own block and runs it against a stubbed `useFetch`.
 *
 * `"use strict"` matters: `<script setup>` compiles to an ES module, and only
 * strict semantics reproduce how an undeclared binding behaves there.
 */
const run = (block: string, result: (ref: <T>(v: T) => Ref<T>) => unknown): Harness => {
  const logged: unknown[][] = [];
  const ref = <T,>(value: T): Ref<T> => ({ value });

  const factory = new Function(
    "useFetch",
    "ref",
    "console",
    "id",
    `"use strict";\n${block}\nreturn { getCompetitionHistory, _competitionHistory };`
  );

  return {
    ...(factory(
      async () => result(ref),
      ref,
      { log: (...args: unknown[]) => logged.push(args) },
      1003
    ) as Omit<Harness, "logged">),
    logged
  };
};

/** What `useFetch` leaves behind when the endpoint answered a real 400. */
const failed = <T,>(ref: (v: unknown) => Ref<unknown>) => ({
  data: ref(null),
  error: ref({ statusCode: 400, statusMessage: "Bad Request" })
});

/** A successful answer: the transformed payload, no error. */
const competitionHistory = [[{ horse_id: 1003, name: "ERNE ALERT" }]];
const succeeded = (ref: (v: unknown) => Ref<unknown>) => ({
  data: ref(competitionHistory),
  error: ref(null)
});

describe.each(pages)("%s — getCompetitionHistory", (_label, relative) => {
  const block = blockOf(relative);
  const code = codeOf(block);

  describe("a failed /api/horse call", () => {
    it("no longer assigns to an identifier the page never declares", () => {
      // `fetchError` is a different identifier and keeps its capital E, so this
      // matches only the bare `error` the page has no binding for.
      expect(code).not.toMatch(/\berror\s*\.\s*value\s*=/);
    });

    it("does not raise a ReferenceError of its own", async () => {
      const page = run(block, failed);

      await page.getCompetitionHistory();

      const raised = page.logged.flat().filter((v) => v instanceof ReferenceError);
      expect(raised).toEqual([]);
    });

    it("reports the failure the server actually sent, not a substitute", async () => {
      const page = run(block, failed);

      await page.getCompetitionHistory();

      expect(page.logged).toHaveLength(1);
      expect(page.logged[0]).toContainEqual({
        statusCode: 400,
        statusMessage: "Bad Request"
      });
    });

    it("leaves the competition history a safe empty list", async () => {
      const page = run(block, failed);

      await page.getCompetitionHistory();

      expect(page._competitionHistory.value).toEqual([]);
    });

    it("never renders the null payload a failed call leaves behind", async () => {
      const page = run(block, failed);

      await page.getCompetitionHistory();

      // The template `v-for`s over this value; null would be the failure
      // becoming a second one at render time.
      expect(page._competitionHistory.value).not.toBeNull();
    });
  });

  describe("a successful /api/horse call", () => {
    it("still assigns the fetched payload unchanged", async () => {
      const page = run(block, succeeded);

      await page.getCompetitionHistory();

      expect(page._competitionHistory.value).toEqual(competitionHistory);
    });

    it("stays quiet", async () => {
      const page = run(block, succeeded);

      await page.getCompetitionHistory();

      expect(page.logged).toEqual([]);
    });
  });

  describe("no dead error state survives", () => {
    // The commented-out lines were the other half of the bad copy. Left in
    // place they are an invitation to re-enable an assignment to state that
    // still does not exist.
    it("carries no commented-out assignment to the undeclared state", () => {
      expect(block).not.toMatch(/\/\/\s*error\s*\.\s*value/);
      expect(block).not.toMatch(/\/\/\s*pending\s*\.\s*value/);
    });

    it("declares no error ref that nothing consumes", () => {
      expect(code).not.toMatch(/\b(?:const|let|var)\s+error\b/);
      expect(code).not.toMatch(/\b(?:const|let|var)\s+pending\b/);
    });
  });
});

/**
 * The two pages are duplicates of one another, and HOR-108 must not fix one and
 * leave the other broken. Comparing the blocks directly is what makes a
 * one-sided fix fail here rather than in production.
 */
describe("both horse-detail pages", () => {
  it("share one competition-history implementation, character for character", () => {
    const [first, second] = pages.map(([, relative]) =>
      blockOf(relative).replace(/\s+/g, " ").trim()
    );

    expect(first).toBe(second);
  });
});
