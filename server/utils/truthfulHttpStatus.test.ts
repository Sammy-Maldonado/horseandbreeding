import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * HOR-96. Before this issue the API answered HTTP 200 to failed requests: a
 * handler that `return`s an object hands that object to Nitro as a *successful*
 * body, so `{ status: 500, body: '{"error":"..."}' }` left the server as
 * `200 OK`. The failure lived in the payload, where no HTTP client can see it —
 * caches, proxies, monitoring and `response.ok` all read it as success.
 *
 * The fix is per-endpoint, not mechanical: a missing field is a 400, a rejected
 * credential a 401, an absent record a 404, a duplicate a 409, and a database
 * failure stays a 500 because the caller did nothing wrong. That reasoning
 * cannot be asserted from source. What *can* be asserted is that no handler
 * ever slides back into answering 200 for a failure, and this test does exactly
 * that across the whole `server/api` surface — including handlers added later.
 *
 * It sits in `server/utils` rather than `server/api` for the same reason
 * `roleScopedEnforcement.test.ts` does: Nitro registers every file under
 * `server/api` as a route, and a test file is not a route.
 *
 * `server/utils/publicError.test.ts` covers the decision layer's own semantics.
 * This covers the surface that layer protects.
 */

const apiDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "api"
);

const handlerFiles = readdirSync(apiDirectory, { recursive: true })
  .map((entry) => String(entry))
  .filter((file) => file.endsWith(".ts"))
  .filter((file) => !/\.(test|spec)\.ts$/.test(file))
  .sort();

const sourceOf = (file: string) => readFileSync(join(apiDirectory, file), "utf8");

/**
 * The brace-balanced block that starts at the first `{` at or after `from`.
 * Regex alone cannot see where a returned object ends, and a nested object
 * literal is exactly where a stale failure status would hide.
 */
const blockAt = (source: string, from: number): string => {
  const start = source.indexOf("{", from);
  if (start === -1) return "";

  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return source.slice(start);
};

const blocksAfter = (source: string, opener: RegExp): string[] => {
  const blocks: string[] = [];
  for (const match of source.matchAll(opener)) {
    blocks.push(blockAt(source, match.index ?? 0));
  }
  return blocks;
};

/** The handler body, so helper functions defined alongside it are not scanned. */
const handlerBodyOf = (source: string): string => {
  const entry = /defineEventHandler\s*\(|export\s+default\s+async\s+function\s*\(/.exec(
    source
  );
  return entry ? blockAt(source, entry.index + entry[0].length - 1) : source;
};

const FAILURE_STATUS = /\b(?:status|statusCode)\s*:\s*(?:4\d{2}|5\d{2})\b/;

describe("truthful HTTP status codes", () => {
  it("finds the handlers it is meant to protect", () => {
    expect(handlerFiles.length).toBeGreaterThan(30);
  });

  it("never returns a failure as a successful body", () => {
    for (const file of handlerFiles) {
      for (const block of blocksAfter(sourceOf(file), /\breturn\s*\{/g)) {
        // A returned object IS the 200 response. A 4xx/5xx inside one is the
        // exact defect HOR-96 removed: the status is data, not transport.
        expect(`${file}: ${block}`).not.toMatch(FAILURE_STATUS);
      }
    }
  });

  it("raises every failure instead of returning it", () => {
    for (const file of handlerFiles) {
      const body = handlerBodyOf(sourceOf(file));
      for (const block of blocksAfter(body, /\bcatch\s*\([^)]*\)\s*\{/g)) {
        // Only the handler's own catches are checked. A helper that recovers
        // in memory and returns a fallback value is not answering a request.
        expect(`${file}: ${block}`).toContain("throw");
      }
    }
  });

  it("gives every raised error an explicit status", () => {
    for (const file of handlerFiles) {
      for (const block of blocksAfter(sourceOf(file), /createError\s*\(\s*\{/g)) {
        // `createError` without a statusCode defaults to 500, which silently
        // turns a caller's mistake into "our fault". Always state it.
        expect(`${file}: ${block}`).toMatch(/\bstatusCode\s*:/);
      }
    }
  });

  it("never puts the raw error into the response", () => {
    for (const file of handlerFiles) {
      const source = sourceOf(file);

      // Prisma messages carry SQL, column names and connection strings;
      // `error.message` carries whatever the dependency chose to say. Those
      // belong in `console.error`, never in a body (CLAUDE.md §7).
      expect(source).not.toMatch(/statusMessage\s*:\s*error\b/);
      expect(source).not.toMatch(/\berror\s*:\s*error\b/);
      expect(source).not.toMatch(
        /(?:message|statusMessage|body|data)\s*:[^,\n]*\berror\.message\b/
      );
    }
  });
});
