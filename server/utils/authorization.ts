import type { AuthContext, UserData } from "./types";

/**
 * Who may perform an action — decided from the authentication context alone,
 * with no knowledge of HTTP.
 *
 * This module is deliberately free of `h3`, mirroring the split accepted for
 * `apiAccessPolicy.ts` (decision) and `apiAccessControl.ts` (glue): the
 * decision is exhaustively testable in the plain Node vitest project, which
 * cannot resolve `h3` at all. `requireAuthorization.ts` owns the HTTP half.
 *
 * The role and scope semantics below are unchanged from before HOR-95. What
 * changed is that a refusal is now a described outcome rather than a thrown
 * `Error` that carried no status and reached the client as a Server Error.
 */

/** The response a refused caller must receive. */
export interface AuthorizationDenial {
  statusCode: 401 | 403;
  statusMessage: string;
  message: string;
}

export type AuthorizationOutcome =
  | { granted: true; user: UserData }
  | { granted: false; denial: AuthorizationDenial };

/**
 * The two refusals, as fixed constants.
 *
 * They name nothing internal — not the required roles, not the required scope,
 * not which of the two was missing, not the token. A caller learns only whether
 * the server recognised them, which is the one bit they are entitled to: 401
 * says "authenticate and try again", 403 says "authenticating again will not
 * help". Any further detail is a map of the permission model.
 */
const UNAUTHENTICATED: AuthorizationDenial = {
  statusCode: 401,
  statusMessage: "Unauthorized",
  message: "Authentication is required to perform this action."
};

const FORBIDDEN: AuthorizationDenial = {
  statusCode: 403,
  statusMessage: "Forbidden",
  message: "You do not have permission to perform this action."
};

/**
 * Checks if the user has any of the specified roles.
 *
 * @param userInfo - The authenticated user, with roles and scopes.
 * @param requiredRoles - An array of roles that need to be checked.
 * @returns boolean - Returns true if the user has at least one of the required roles.
 */
function hasAnyRole(userInfo: UserData, requiredRoles: string[]): boolean {
  return userInfo.roles.some((role) => requiredRoles.includes(role.roleName));
}

/**
 * Checks if the user has a specific scope.
 *
 * @param userInfo - The authenticated user, with roles and scopes.
 * @param requiredScope - The scope that needs to be checked.
 * @returns boolean - Returns true if the user has the required scope.
 */
function hasScope(userInfo: UserData, requiredScope: string): boolean {
  return userInfo.roles.some((role) => role.scopes.includes(requiredScope));
}

/**
 * Checks if the user has at least one of the required roles and the specified scope.
 *
 * @param userInfo - The authenticated user, with roles and scopes.
 * @param requiredRoles - An array of roles that need to be checked.
 * @param requiredScope - The scope that needs to be checked.
 * @returns boolean - Returns true if the user has one of the required roles and the required scope.
 */
export function hasRoleAndScope(
  userInfo: UserData,
  requiredRoles: string[],
  requiredScope: string
): boolean {
  return (
    hasAnyRole(userInfo, requiredRoles) && hasScope(userInfo, requiredScope)
  );
}

/** True only for a context that identifies a user. */
function isAuthenticated(userInfo: AuthContext): userInfo is UserData {
  return userInfo !== null && userInfo !== undefined;
}

/**
 * Decides whether a caller may act, requiring one of `requiredRoles` and
 * `requiredScope`.
 *
 * An absent context is refused before any role is read, which is what stops
 * `userInfo.roles` from throwing. The refusal is 401 rather than 403 because
 * the server does not know who the caller is; it says nothing about whether
 * an authenticated caller would have been allowed.
 */
export function authorizeRoleAndScope(
  userInfo: AuthContext,
  requiredRoles: string[],
  requiredScope: string
): AuthorizationOutcome {
  if (!isAuthenticated(userInfo)) {
    return { granted: false, denial: UNAUTHENTICATED };
  }

  if (!hasRoleAndScope(userInfo, requiredRoles, requiredScope)) {
    return { granted: false, denial: FORBIDDEN };
  }

  return { granted: true, user: userInfo };
}

/**
 * Decides whether a caller may act, requiring `requiredScope` under any role.
 */
export function authorizeScope(
  userInfo: AuthContext,
  requiredScope: string
): AuthorizationOutcome {
  if (!isAuthenticated(userInfo)) {
    return { granted: false, denial: UNAUTHENTICATED };
  }

  if (!hasScope(userInfo, requiredScope)) {
    return { granted: false, denial: FORBIDDEN };
  }

  return { granted: true, user: userInfo };
}
