import type { UserData } from "./types"; // Adjust the import based on your project structure

/**
 * Checks if the user has any of the specified roles.
 *
 * @param userInfo - The user information object containing roles and scopes.
 * @param requiredRoles - An array of roles that need to be checked.
 * @returns boolean - Returns true if the user has at least one of the required roles.
 */
function hasAnyRole(userInfo: UserData, requiredRoles: string[]): boolean {
  return userInfo.roles.some((role) => requiredRoles.includes(role.roleName));
}

/**
 * Checks if the user has a specific scope.
 *
 * @param userInfo - The user information object containing roles and scopes.
 * @param requiredScope - The scope that needs to be checked.
 * @returns boolean - Returns true if the user has the required scope.
 */
function hasScope(userInfo: UserData, requiredScope: string): boolean {
  return userInfo.roles.some((role) => role.scopes.includes(requiredScope));
}

/**
 * Checks if the user has at least one of the required roles and the specified scope.
 *
 * @param userInfo - The user information object containing roles and scopes.
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

/**
 * Throws an error if the user does not have at least one of the required roles and the specified scope.
 *
 * @param userInfo - The user information object containing roles and scopes.
 * @param requiredRoles - An array of roles that need to be checked.
 * @param requiredScope - The scope that needs to be checked.
 */
export function ensureHasRoleAndScope(
  userInfo: UserData,
  requiredRoles: string[],
  requiredScope: string
): void {
  if (!hasRoleAndScope(userInfo, requiredRoles, requiredScope)) {
    throw new Error(
      `Permission denied: User must have one of the roles '${requiredRoles.join(", ")}' and the scope '${requiredScope}'`
    );
  }
}

/**
 * Throws an error if the user does not have the required role or scope.
 *
 * @param userInfo - The user information object containing roles and scopes.
 * @param requiredScope - The scope that needs to be checked.
 */
export function ensureHasScope(
  userInfo: UserData,
  requiredScope: string
): void {
  if (!hasScope(userInfo, requiredScope)) {
    throw new Error(
      `Permission denied: User does not have the '${requiredScope}' scope`
    );
  }
}
