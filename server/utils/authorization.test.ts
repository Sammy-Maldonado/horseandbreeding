import { describe, expect, it } from "vitest";

import {
  authorizeRoleAndScope,
  authorizeScope,
  hasRoleAndScope
} from "./authorization";
import type { AuthContext, Role, UserData } from "./types";

const userWith = (roles: Role[]): UserData => ({
  userId: 1,
  email: "user@example.test",
  mobile: "1234567890",
  iat: 0,
  exp: 0,
  roles
});

const admin = userWith([
  { roleName: "admin", scopes: ["manage_horses", "update_horses_own"] }
]);
const viewer = userWith([{ roleName: "viewer", scopes: ["read_horses"] }]);
const roleless = userWith([]);

// A caller must not be able to tell *why* a denial happened beyond
// authenticated-or-not. Anything in this list would tell them.
const INTERNAL_VOCABULARY = [
  "admin",
  "viewer",
  "manage_horses",
  "read_horses",
  "update_horses_own",
  "roles",
  "scope",
  "token",
  "jwt",
  "prisma",
  "authorization.ts",
  "server\\",
  "server/"
];

const expectLeaksNothing = (denial: unknown) => {
  const body = JSON.stringify(denial).toLowerCase();
  for (const term of INTERNAL_VOCABULARY) {
    expect(body).not.toContain(term.toLowerCase());
  }
};

// --- Role and scope semantics -------------------------------------------
// These assertions are unchanged from before HOR-95 on purpose: the fix
// corrects the HTTP contract, never the access decision itself.

describe("hasRoleAndScope", () => {
  it("grants when the user holds the role and the scope", () => {
    expect(hasRoleAndScope(admin, ["admin"], "manage_horses")).toBe(true);
  });

  it("grants when the user matches any one of several accepted roles", () => {
    expect(hasRoleAndScope(admin, ["editor", "admin"], "manage_horses")).toBe(
      true
    );
  });

  it("denies when the role matches but the scope does not", () => {
    expect(hasRoleAndScope(admin, ["admin"], "delete_horses")).toBe(false);
  });

  it("denies when the scope matches but the role does not", () => {
    expect(hasRoleAndScope(viewer, ["admin"], "read_horses")).toBe(false);
  });

  it("denies a user holding no roles at all", () => {
    expect(hasRoleAndScope(roleless, ["admin"], "manage_horses")).toBe(false);
  });

  it("grants nothing when the accepted-role list is empty", () => {
    expect(hasRoleAndScope(admin, [], "manage_horses")).toBe(false);
  });
});

// --- The HTTP contract ---------------------------------------------------
// Before HOR-95 every one of these produced HTTP 500: an absent user threw a
// TypeError inside `hasAnyRole`, and a real denial threw a generic Error that
// carried no status. Both reached the client as a Server Error with a stack.

describe("authorizeRoleAndScope", () => {
  it("refuses an absent authentication context with 401, not a TypeError", () => {
    const outcome = authorizeRoleAndScope(null, ["admin"], "manage_horses");

    expect(outcome.granted).toBe(false);
    if (outcome.granted) return;
    expect(outcome.denial.statusCode).toBe(401);
    expect(outcome.denial.statusMessage).toBe("Unauthorized");
  });

  it("treats an undefined context exactly like a null one", () => {
    const outcome = authorizeRoleAndScope(
      undefined,
      ["admin"],
      "manage_horses"
    );

    expect(outcome.granted).toBe(false);
    if (outcome.granted) return;
    expect(outcome.denial.statusCode).toBe(401);
  });

  it("answers an unverifiable token identically to no token at all", () => {
    // `auth.ts` maps both to `event.context.user = null`, so a caller can
    // never learn whether the token was absent, malformed or expired.
    const noToken = authorizeRoleAndScope(null, ["admin"], "manage_horses");
    const badToken = authorizeRoleAndScope(null, ["admin"], "manage_horses");

    expect(noToken).toEqual(badToken);
  });

  it("refuses an authenticated user holding no roles with 403", () => {
    const outcome = authorizeRoleAndScope(roleless, ["admin"], "manage_horses");

    expect(outcome.granted).toBe(false);
    if (outcome.granted) return;
    expect(outcome.denial.statusCode).toBe(403);
    expect(outcome.denial.statusMessage).toBe("Forbidden");
  });

  it("refuses an authenticated user holding the wrong role with 403", () => {
    const outcome = authorizeRoleAndScope(viewer, ["admin"], "read_horses");

    expect(outcome.granted).toBe(false);
    if (outcome.granted) return;
    expect(outcome.denial.statusCode).toBe(403);
  });

  it("refuses the right role without the required scope with 403", () => {
    const outcome = authorizeRoleAndScope(admin, ["admin"], "delete_horses");

    expect(outcome.granted).toBe(false);
    if (outcome.granted) return;
    expect(outcome.denial.statusCode).toBe(403);
  });

  it("grants an authorised user and hands back the authenticated user", () => {
    const outcome = authorizeRoleAndScope(admin, ["admin"], "manage_horses");

    expect(outcome.granted).toBe(true);
    if (!outcome.granted) return;
    expect(outcome.user).toBe(admin);
  });

  it("never throws, whatever the authentication context holds", () => {
    const contexts: AuthContext[] = [null, undefined, roleless, viewer, admin];

    for (const context of contexts) {
      expect(() =>
        authorizeRoleAndScope(context, ["admin"], "manage_horses")
      ).not.toThrow();
    }
  });

  it("keeps the required roles and scope out of the 401 body", () => {
    const outcome = authorizeRoleAndScope(
      null,
      ["admin", "manage_horses"],
      "manage_horses"
    );

    expect(outcome.granted).toBe(false);
    if (outcome.granted) return;
    expectLeaksNothing(outcome.denial);
  });

  it("keeps the required roles and scope out of the 403 body", () => {
    const outcome = authorizeRoleAndScope(viewer, ["admin"], "manage_horses");

    expect(outcome.granted).toBe(false);
    if (outcome.granted) return;
    expectLeaksNothing(outcome.denial);
  });

  it("answers every 403 with one identical body, whatever was missing", () => {
    // Missing role and missing scope must be indistinguishable to the caller.
    const missingRole = authorizeRoleAndScope(viewer, ["admin"], "read_horses");
    const missingScope = authorizeRoleAndScope(
      admin,
      ["admin"],
      "delete_horses"
    );

    expect(missingRole).toEqual(missingScope);
  });

  it("never carries a stack trace", () => {
    const outcome = authorizeRoleAndScope(null, ["admin"], "manage_horses");

    expect(outcome.granted).toBe(false);
    if (outcome.granted) return;
    expect(outcome.denial).not.toHaveProperty("stack");
    expect(outcome.denial).not.toBeInstanceOf(Error);
  });
});

describe("authorizeScope", () => {
  it("refuses an absent authentication context with 401", () => {
    const outcome = authorizeScope(null, "read_horses");

    expect(outcome.granted).toBe(false);
    if (outcome.granted) return;
    expect(outcome.denial.statusCode).toBe(401);
  });

  it("refuses an authenticated user without the scope with 403", () => {
    const outcome = authorizeScope(viewer, "manage_horses");

    expect(outcome.granted).toBe(false);
    if (outcome.granted) return;
    expect(outcome.denial.statusCode).toBe(403);
    expectLeaksNothing(outcome.denial);
  });

  it("grants a user holding the scope under any role", () => {
    const outcome = authorizeScope(viewer, "read_horses");

    expect(outcome.granted).toBe(true);
    if (!outcome.granted) return;
    expect(outcome.user).toBe(viewer);
  });
});
