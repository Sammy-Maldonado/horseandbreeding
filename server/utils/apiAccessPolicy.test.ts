import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  API_ACCESS_POLICY,
  apiAccessDenial,
  classifyApiRoute,
  isBrowserReachable,
  isModuleOwnedApiPath,
  routeNameFromUrl,
} from "./apiAccessPolicy";

const apiDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "api"
);

/**
 * Every handler file in `server/api` collapses to the route name Nitro serves
 * it under: `user.put.ts` and `user.post.ts` are both `/api/user`.
 */
const declaredRouteFiles = () =>
  new Set(
    readdirSync(apiDirectory)
      .filter((file) => file.endsWith(".ts"))
      // Nuxt excludes `*.test.ts` and `*.spec.ts` from server route scanning, so
      // a test sitting beside the handler it protects is never served. Verified
      // for HOR-74: the built `.output/` contains no route for the test file.
      // Without this the policy would demand a classification for something
      // Nitro has never registered.
      .filter((file) => !/\.(test|spec)\.ts$/.test(file))
      .map((file) => file.replace(/(\.(get|post|put|patch|delete))?\.ts$/, ""))
  );

describe("routeNameFromUrl", () => {
  it("extracts the route name from a plain /api path", () => {
    expect(routeNameFromUrl("/api/pedigree-detail")).toBe("pedigree-detail");
  });

  it("ignores a query string", () => {
    expect(routeNameFromUrl("/api/vendor?name=x&contact=y")).toBe("vendor");
  });

  it("ignores a trailing slash", () => {
    expect(routeNameFromUrl("/api/search/")).toBe("search");
  });

  it("returns null for a path outside /api", () => {
    expect(routeNameFromUrl("/pedigree/some-horse/1003")).toBeNull();
  });

  it("returns null for /api itself", () => {
    expect(routeNameFromUrl("/api")).toBeNull();
  });

  it("does not treat a lookalike prefix as an API route", () => {
    expect(routeNameFromUrl("/apixyz/search")).toBeNull();
  });
});

describe("API_ACCESS_POLICY completeness", () => {
  it("classifies every route file present in server/api", () => {
    const unclassified = [...declaredRouteFiles()].filter(
      (route) => !(route in API_ACCESS_POLICY)
    );

    expect(unclassified).toEqual([]);
  });

  it("does not classify routes that no longer exist", () => {
    const files = declaredRouteFiles();
    const stale = Object.keys(API_ACCESS_POLICY).filter(
      (route) => !files.has(route)
    );

    expect(stale).toEqual([]);
  });
});

describe("classifyApiRoute", () => {
  it("treats the five role-scoped routes as role-scoped", () => {
    for (const route of [
      "addHorse",
      "add-full-horse-details",
      "report-horses-ids",
      "uploadImages",
      "user-info",
    ]) {
      expect(classifyApiRoute(`/api/${route}`)).toBe("role-scoped");
    }
  });

  it("treats the credential-exchange routes as public", () => {
    expect(classifyApiRoute("/api/login")).toBe("public");
    expect(classifyApiRoute("/api/refresh-token")).toBe("public");
  });

  it("treats the public pedigree reads as public", () => {
    for (const route of [
      "search",
      "pedigree-detail",
      "mareline",
      "progeny",
      "storehorses",
    ]) {
      expect(classifyApiRoute(`/api/${route}`)).toBe("public");
    }
  });

  it("treats the authenticated profile read as authenticated", () => {
    // HOR-98: the first occupant of ADR-007's "authenticated" level. The
    // middleware lets it through; the handler itself enforces the 401.
    expect(classifyApiRoute("/api/user-profile")).toBe("authenticated");
  });

  it("treats send-email as server-only so it cannot be used as a mail relay", () => {
    expect(classifyApiRoute("/api/send-email")).toBe("server-only");
  });

  it("treats the events debug endpoint as server-only", () => {
    expect(classifyApiRoute("/api/events")).toBe("server-only");
  });

  it("denies an /api route that nobody classified", () => {
    expect(classifyApiRoute("/api/not-a-real-route")).toBe("server-only");
  });

  it("leaves non-API paths unclassified", () => {
    expect(classifyApiRoute("/search/mare/1")).toBeNull();
  });
});

describe("isBrowserReachable", () => {
  it("allows every level the browser is meant to call", () => {
    expect(isBrowserReachable("public")).toBe(true);
    expect(isBrowserReachable("authenticated")).toBe(true);
    expect(isBrowserReachable("role-scoped")).toBe(true);
  });

  it("refuses server-only routes", () => {
    expect(isBrowserReachable("server-only")).toBe(false);
  });
});

describe("isModuleOwnedApiPath", () => {
  it("recognises the underscore-prefixed paths a module registers for itself", () => {
    expect(isModuleOwnedApiPath("/api/_content/query")).toBe(true);
    expect(isModuleOwnedApiPath("/api/_content/navigation/abc123")).toBe(true);
    expect(isModuleOwnedApiPath("/api/_content/cache.1786211738577.json")).toBe(
      true
    );
  });

  it("does not treat an application route as module-owned", () => {
    expect(isModuleOwnedApiPath("/api/send-email")).toBe(false);
    expect(isModuleOwnedApiPath("/api/pedigree-detail")).toBe(false);
  });

  it("only accepts the underscore on the first segment", () => {
    expect(isModuleOwnedApiPath("/api/send-email/_content")).toBe(false);
  });

  it("classifies no route this application owns as module-owned", () => {
    const moduleOwned = [...declaredRouteFiles()].filter((route) =>
      isModuleOwnedApiPath(`/api/${route}`)
    );

    expect(moduleOwned).toEqual([]);
  });
});

describe("classifyApiRoute leaves module-owned paths ungoverned", () => {
  it("returns null for an underscore-prefixed module route", () => {
    expect(classifyApiRoute("/api/_content/query")).toBeNull();
  });
});

describe("apiAccessDenial", () => {
  it("lets a module serve its own underscore-prefixed routes", () => {
    expect(apiAccessDenial("/api/_content/query")).toBeNull();
    expect(
      apiAccessDenial("/api/_content/cache.1786211738577.json")
    ).toBeNull();
  });

  it("lets a public read through", () => {
    expect(apiAccessDenial("/api/pedigree-detail?id=1003")).toBeNull();
  });

  it("lets a role-scoped route through, because the handler enforces it", () => {
    expect(apiAccessDenial("/api/addHorse")).toBeNull();
  });

  it("lets credential exchange through", () => {
    expect(apiAccessDenial("/api/login")).toBeNull();
    expect(apiAccessDenial("/api/refresh-token")).toBeNull();
  });

  it("lets the authenticated profile read through to its handler", () => {
    expect(apiAccessDenial("/api/user-profile")).toBeNull();
  });

  it("lets every non-API request through untouched", () => {
    expect(apiAccessDenial("/")).toBeNull();
    expect(apiAccessDenial("/pedigree/some-horse/1003")).toBeNull();
    expect(apiAccessDenial("/_nuxt/entry.js")).toBeNull();
  });

  it("refuses send-email so it cannot be used as a mail relay", () => {
    expect(apiAccessDenial("/api/send-email")).toEqual({
      statusCode: 404,
      statusMessage: "Not Found",
    });
  });

  it("refuses the events debug endpoint", () => {
    expect(apiAccessDenial("/api/events")).not.toBeNull();
  });

  it("refuses a server-only route reached with a query string", () => {
    expect(apiAccessDenial("/api/send-email?to=someone@example.test")).not
      .toBeNull();
  });

  it("refuses an /api route that nobody classified", () => {
    expect(apiAccessDenial("/api/not-a-real-route")).not.toBeNull();
  });

  it("answers 404 rather than 403, so a refusal confirms nothing", () => {
    expect(apiAccessDenial("/api/send-email")?.statusCode).toBe(404);
  });

  it("decides from the path alone and reads no credential", () => {
    expect(apiAccessDenial.length).toBe(1);
  });
});

describe("the GET credential endpoint is gone (HOR-98)", () => {
  it("no longer classifies user-by-email-pass at all", () => {
    // The route was removed completely — no alias, no deprecated stub. An
    // entry reappearing here would mean someone revived it.
    expect(API_ACCESS_POLICY).not.toHaveProperty("user-by-email-pass");
  });

  it("denies the old URL like any unknown route, confirming nothing", () => {
    expect(apiAccessDenial("/api/user-by-email-pass")).toEqual({
      statusCode: 404,
      statusMessage: "Not Found",
    });
  });

  it("denies the old URL even when credentials ride the query string", () => {
    expect(
      apiAccessDenial(
        "/api/user-by-email-pass?email=someone@example.test&password=x"
      )?.statusCode
    ).toBe(404);
  });
});

describe("the shared API credential is gone from the policy", () => {
  it("exposes no api-key, secret or credential concept", () => {
    const serialised = JSON.stringify(API_ACCESS_POLICY);

    expect(serialised).not.toMatch(/api-key/i);
    expect(serialised).not.toMatch(/VITE_API_KEY/);
  });
});
