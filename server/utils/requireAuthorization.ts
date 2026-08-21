import { createError } from "h3";

import { authorizeRoleAndScope, authorizeScope } from "./authorization";
import type { AuthContext, UserData } from "./types";

/**
 * The HTTP half of role and scope authorization: it turns the decision made in
 * `authorization.ts` into a real response status, and returns the authenticated
 * user when the caller is allowed through.
 *
 * It exists as its own module for the same reason `apiAccessControl.ts` does —
 * `createError` comes from `h3`, and `h3` is a transitive dependency of nitropack
 * that the plain Node vitest project cannot resolve. Keeping the import here
 * leaves the decision itself exhaustively unit-testable.
 *
 * `throw`, not `return`: a handler that returns an error object sends that
 * object as the body with status 200, which is exactly the shape HOR-95
 * removed from these handlers.
 *
 * Returning `UserData` is what lets a handler drop its `as UserData` cast and
 * its null check — past this call the user is present by construction.
 */

export function ensureHasRoleAndScope(
  userInfo: AuthContext,
  requiredRoles: string[],
  requiredScope: string
): UserData {
  const outcome = authorizeRoleAndScope(userInfo, requiredRoles, requiredScope);

  if (!outcome.granted) {
    throw createError(outcome.denial);
  }

  return outcome.user;
}

export function ensureHasScope(
  userInfo: AuthContext,
  requiredScope: string
): UserData {
  const outcome = authorizeScope(userInfo, requiredScope);

  if (!outcome.granted) {
    throw createError(outcome.denial);
  }

  return outcome.user;
}
