import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { API_ACCESS_POLICY } from "./apiAccessPolicy";

/**
 * ADR-007 delegates role-scoped enforcement to the handler. That delegation is
 * only as good as the handlers, and before HOR-95 every one of them was wrong
 * in the same three ways: the guard threw a status-less error, four handlers
 * carried an unreachable `if (!userInfo)` block that would have answered HTTP
 * 200 with an error-shaped body, and one carried no guard beyond the throw.
 *
 * `apiAccessPolicy.test.ts` proves every route is *classified*. This proves
 * every route classified `role-scoped` is actually *enforced*, and enforced
 * through the single authorization path — so a new protected handler cannot
 * quietly reintroduce any of the three.
 */

const apiDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "api"
);

const roleScopedRoutes = Object.entries(API_ACCESS_POLICY)
  .filter(([, level]) => level === "role-scoped")
  .map(([route]) => route);

/** Every handler file Nitro serves under the given route name. */
const filesForRoute = (route: string) =>
  readdirSync(apiDirectory)
    .filter((file) => file.endsWith(".ts"))
    .filter((file) => !/\.(test|spec)\.ts$/.test(file))
    .filter(
      (file) =>
        file.replace(/(\.(get|post|put|patch|delete))?\.ts$/, "") === route
    );

const sourceOf = (file: string) => readFileSync(join(apiDirectory, file), "utf8");

describe("role-scoped route enforcement", () => {
  it("finds a handler file for every role-scoped route", () => {
    expect(roleScopedRoutes.length).toBeGreaterThan(0);

    for (const route of roleScopedRoutes) {
      expect(filesForRoute(route).length).toBeGreaterThan(0);
    }
  });

  it("enforces through the single authorization path", () => {
    for (const route of roleScopedRoutes) {
      for (const file of filesForRoute(route)) {
        const source = sourceOf(file);

        expect(source).toContain("ensureHasRoleAndScope");
        expect(source).toMatch(
          /from\s+["']\.\.\/utils\/requireAuthorization["']/
        );
        // The pure decision layer is never imported directly by a handler:
        // it cannot raise an HTTP status.
        expect(source).not.toMatch(/from\s+["']\.\.\/utils\/authorization["']/);
      }
    }
  });

  it("runs the guard before the handler's first try block", () => {
    for (const route of roleScopedRoutes) {
      for (const file of filesForRoute(route)) {
        const source = sourceOf(file);
        // Only the handler body counts: a helper defined above it may open its
        // own try block, which the guard legitimately follows in file order.
        const body = source.slice(source.indexOf("defineEventHandler"));
        const guard = body.indexOf("ensureHasRoleAndScope(");
        const firstTry = body.search(/\btry\s*\{/);

        expect(guard).toBeGreaterThan(-1);
        if (firstTry === -1) continue;
        // A guard inside `try` would let the handler's own catch convert a
        // 401 or 403 into whatever that catch returns.
        expect(guard).toBeLessThan(firstTry);
      }
    }
  });

  it("never answers a denial with HTTP 200 and an error-shaped body", () => {
    for (const route of roleScopedRoutes) {
      for (const file of filesForRoute(route)) {
        const source = sourceOf(file);

        expect(source).not.toMatch(/return\s*\{\s*statusCode:\s*401/);
        expect(source).not.toMatch(/return\s*\{\s*statusCode:\s*403/);
      }
    }
  });
});
