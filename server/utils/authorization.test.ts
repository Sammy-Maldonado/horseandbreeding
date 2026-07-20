import { describe, expect, it } from "vitest";
import type { UserData } from "./types";
import {
  ensureHasRoleAndScope,
  ensureHasScope,
  hasRoleAndScope,
} from "./authorization";

const userWith = (roles: UserData["roles"]): UserData => ({
  userId: 1,
  email: "marcus@example.com",
  mobile: "",
  iat: 0,
  exp: 0,
  roles,
});

const admin = userWith([
  { roleName: "admin", scopes: ["manage_horses", "update_horses_own"] },
]);
const viewer = userWith([{ roleName: "viewer", scopes: ["read_horses"] }]);
const roleless = userWith([]);

describe("hasRoleAndScope", () => {
  it("grants access when the user has both a required role and the scope", () => {
    expect(hasRoleAndScope(admin, ["admin"], "manage_horses")).toBe(true);
  });

  it("grants access when the user matches any one of several required roles", () => {
    expect(hasRoleAndScope(admin, ["editor", "admin"], "manage_horses")).toBe(
      true
    );
  });

  it("denies access when the role matches but the scope does not", () => {
    expect(hasRoleAndScope(admin, ["admin"], "delete_horses")).toBe(false);
  });

  it("denies access when the scope matches but the role does not", () => {
    expect(hasRoleAndScope(viewer, ["admin"], "read_horses")).toBe(false);
  });

  it("denies access when the user has no roles at all", () => {
    expect(hasRoleAndScope(roleless, ["admin"], "manage_horses")).toBe(false);
  });

  it("denies access when no roles are required — an empty allowlist grants nothing", () => {
    expect(hasRoleAndScope(admin, [], "manage_horses")).toBe(false);
  });
});

describe("ensureHasRoleAndScope", () => {
  it("does not throw when the user is authorised", () => {
    expect(() =>
      ensureHasRoleAndScope(admin, ["admin"], "manage_horses")
    ).not.toThrow();
  });

  it("throws naming the required roles and scope when the user is not authorised", () => {
    expect(() =>
      ensureHasRoleAndScope(viewer, ["admin", "editor"], "manage_horses")
    ).toThrow("roles 'admin, editor' and the scope 'manage_horses'");
  });
});

describe("ensureHasScope", () => {
  it("does not throw when the scope is present, regardless of role name", () => {
    expect(() => ensureHasScope(viewer, "read_horses")).not.toThrow();
  });

  it("throws naming the missing scope", () => {
    expect(() => ensureHasScope(viewer, "manage_horses")).toThrow(
      "does not have the 'manage_horses' scope"
    );
  });
});
