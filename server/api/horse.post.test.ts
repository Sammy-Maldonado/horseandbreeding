import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * HOR-107 — guards on the wiring of `POST /api/horse` that the pure tests in
 * `server/utils/pedigreeSelect.test.ts` cannot see.
 *
 * The recursion itself is proven to terminate there, against the real builder.
 * What is left is the route: the depth a missing horse produces must never
 * reach that builder, and a request missing a required field must still be the
 * caller's 400 rather than the server's 500 (HOR-96).
 *
 * These read the route's own source, the one thing CI can always inspect
 * without a database, in the same way `credential-transport.test.ts` does.
 */

const routeSource = readFileSync(
  fileURLToPath(new URL("./horse.post.ts", import.meta.url)),
  "utf8"
);

/**
 * The source with its comments removed. The comment above `if (!storeHorse)`
 * quotes the defect verbatim so the next reader knows what went wrong, and it
 * must not be mistaken for the defect itself.
 */
const routeCode = routeSource
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

describe("POST /api/horse — a missing horse never becomes a depth", () => {
  it("no longer decrements the walker's level to invent one", () => {
    expect(routeCode).not.toMatch(/--\s*level/);
  });

  it("reports absence as absence", () => {
    expect(routeSource).toMatch(/if\s*\(!storeHorse\)\s*\{\s*return null;/);
  });

  // Case C — the guard has to sit between the walker and the builder, not after.
  it("validates the depth before building a select with it", () => {
    const guard = routeSource.indexOf("isValidPedigreeLevel(level)");
    const build = routeSource.indexOf("buildSelect(level, level)");

    expect(guard).toBeGreaterThan(-1);
    expect(build).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(build);
  });
});

describe("POST /api/horse — HTTP semantics", () => {
  // Case H — a request missing `id` or `level` is still the caller's mistake.
  it("keeps answering a request missing a required field with 400", () => {
    expect(routeSource).toMatch(/if\s*\(!body\.level\s*\|\|\s*!body\.id\)/);
    expect(routeSource).toMatch(/statusCode:\s*400/);
  });

  it("still answers an unexpected server failure with a bare 500", () => {
    expect(routeSource).toMatch(/statusCode:\s*500/);
    expect(routeSource).toMatch(/message:\s*"Internal Server Error"/);
  });
});
