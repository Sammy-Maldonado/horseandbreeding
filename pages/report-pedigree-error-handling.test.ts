import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * HOR-116 defect A — how `pages/report.vue` handles a failed `POST /api/pedigree`.
 *
 * `fetchPedigree` destructured a property that does not exist:
 *
 *   const { data: fetchData, erro: fetchError } = await useFetch(url, { ... });
 *
 * The Nuxt AsyncData property is `error`. `erro` is not on the object
 * `useFetch` returns, so `fetchError` was permanently `undefined` — and nothing
 * in the page ever read it. The symptom is not a crash, it is silence:
 * `useFetch` reports a failed request through `error` and does not throw, so
 * the `catch` below never ran, `data.value` stayed null, `pedigrees` became the
 * safe empty list, and the failure was reported nowhere at all.
 *
 * This is the same copy-paste family as HOR-108 with the opposite symptom:
 * HOR-108 had a *use* with no declaration, this had a *declaration* with no use.
 *
 * The page has no error surface of its own to route a pedigree failure to — the
 * `isError`/`message` banner belongs to `fetchHorse`, which runs concurrently —
 * so the failure is reported through the diagnostic path the function already
 * uses. Inventing an error UI is a product decision this issue does not own.
 *
 * These tests run the page's own source. The block is lifted verbatim from
 * `<script setup>` and executed under `"use strict"` — the semantics an SFC
 * compiles to — with `useFetch` stubbed. No Nuxt, no network, no database, and
 * nothing about the assertions can drift away from what the page actually ships.
 */

/** The pedigree block, from its state declaration to the next declaration. */
const BLOCK_START = "const pedigrees = ref([]);";
const BLOCK_END = "const exportToDocx";

const source = readFileSync(
  fileURLToPath(new URL("./report.vue", import.meta.url)),
  "utf8"
);

const block = ((): string => {
  const from = source.indexOf(BLOCK_START);
  const to = source.indexOf(BLOCK_END, from);

  expect(from).toBeGreaterThan(-1);
  expect(to).toBeGreaterThan(from);

  return source.slice(from, to);
})();

/** The block with its comments removed, so a comment is never read as code. */
const code = block.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

interface Ref<T> {
  value: T;
}

interface Harness {
  fetchPedigree: () => Promise<void>;
  pedigrees: Ref<unknown>;
  /** Every argument list the block passed to `console.error`. */
  logged: unknown[][];
  /** Every request the block passed to `useFetch`. */
  requests: Array<[string, Record<string, unknown>]>;
}

/**
 * Compiles the page's own block and runs it against a stubbed `useFetch`.
 *
 * `"use strict"` matters: `<script setup>` compiles to an ES module, and only
 * strict semantics reproduce how an undeclared binding behaves there.
 */
const run = (
  result: (ref: <T>(v: T) => Ref<T>) => Record<string, unknown>
): Harness => {
  const logged: unknown[][] = [];
  const requests: Array<[string, Record<string, unknown>]> = [];
  const ref = <T,>(value: T): Ref<T> => ({ value });

  const factory = new Function(
    "useFetch",
    "ref",
    "console",
    "search",
    `"use strict";\n${block}\nreturn { fetchPedigree, pedigrees };`
  );

  return {
    ...(factory(
      async (url: string, options: Record<string, unknown>) => {
        requests.push([url, options]);
        return result(ref);
      },
      ref,
      { error: (...args: unknown[]) => logged.push(args) },
      ref("59295")
    ) as Omit<Harness, "logged" | "requests">),
    logged,
    requests
  };
};

/** What `useFetch` leaves behind when `/api/pedigree` answered a real 400. */
const rejected = { statusCode: 400, statusMessage: "Bad Request" };
const failed = (ref: <T>(v: T) => Ref<T>) => ({
  data: ref(null),
  error: ref(rejected)
});

/** A successful answer: the transformed payload, no error. */
const pedigree = [[{ name: "ERNE ALERT", sire: { name: "ABLE ALBERT" } }]];
const succeeded = (ref: <T>(v: T) => Ref<T>) => ({
  data: ref(pedigree),
  error: ref(null)
});

/**
 * Every property `useFetch` puts on the object it returns. Destructuring
 * anything else yields `undefined` silently, which is exactly how `erro`
 * survived review.
 */
const ASYNC_DATA_PROPERTIES = [
  "data",
  "error",
  "status",
  "pending",
  "refresh",
  "execute",
  "clear"
];

/** The names the block takes off the `useFetch` result, source and local. */
const destructuredBindings = (): Array<{ source: string; local: string }> => {
  const matched = code.match(/const\s*\{([^}]*)\}\s*=\s*await\s+useFetch/);

  expect(matched).not.toBeNull();

  return (matched as RegExpMatchArray)[1]
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [source, local] = entry.split(":").map((part) => part.trim());
      return { source, local: local ?? source };
    });
};

describe("pages/report.vue — fetchPedigree", () => {
  describe("what it destructures from useFetch", () => {
    it("names only properties the returned object actually has", () => {
      const bindings = destructuredBindings();

      expect(bindings.length).toBeGreaterThan(0);
      for (const { source } of bindings) {
        expect(ASYNC_DATA_PROPERTIES).toContain(source);
      }
    });

    it("takes the error through its real name", () => {
      expect(code).toMatch(/\berror\s*:\s*fetchError\b/);
    });
  });

  describe("a failed /api/pedigree call", () => {
    it("reports the failure the server actually sent", async () => {
      const page = run(failed);

      await page.fetchPedigree();

      expect(page.logged).toHaveLength(1);
      expect(page.logged[0]).toContainEqual(rejected);
    });

    it("reports nothing it manufactured itself", async () => {
      const page = run(failed);

      await page.fetchPedigree();

      // Whatever reaches the diagnostic path is the endpoint's own safe
      // payload, never a substitute the page invented (HOR-99, HOR-108).
      expect(page.logged[0]).not.toContainEqual(expect.any(Error));
    });

    it("leaves the pedigree list a safe empty list", async () => {
      const page = run(failed);

      await page.fetchPedigree();

      expect(page.pedigrees.value).toEqual([]);
    });

    it("never leaves behind the null payload a failed call carries", async () => {
      const page = run(failed);

      await page.fetchPedigree();

      // The template does `:pedigrees="pedigrees[index]"`; null here would be
      // the failure becoming a second one at render time.
      expect(page.pedigrees.value).not.toBeNull();
    });
  });

  describe("a successful /api/pedigree call", () => {
    it("still assigns the fetched payload unchanged", async () => {
      const page = run(succeeded);

      await page.fetchPedigree();

      expect(page.pedigrees.value).toEqual(pedigree);
    });

    it("stays quiet", async () => {
      const page = run(succeeded);

      await page.fetchPedigree();

      expect(page.logged).toEqual([]);
    });

    it("sends the request the endpoint already expects", async () => {
      const page = run(succeeded);

      await page.fetchPedigree();

      expect(page.requests).toHaveLength(1);

      const [url, options] = page.requests[0];
      expect(url).toBe("/api/pedigree");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body as string)).toEqual({
        id: "59295",
        level: 3
      });
    });
  });

  describe("no dead state survives", () => {
    it("reads every binding it takes off the response", () => {
      for (const { local } of destructuredBindings()) {
        const uses = code.match(new RegExp(`\\b${local}\\b`, "g")) ?? [];

        // One occurrence is the declaration itself; a binding with no second
        // occurrence is a variable nothing consumes — which is what `erro`
        // left behind and what a rename alone would leave behind again.
        expect(uses.length).toBeGreaterThan(1);
      }
    });
  });
});
