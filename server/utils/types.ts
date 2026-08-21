// Define the structure of the role and scope within the UserData
export type Role = {
  roleName: string;
  scopes: string[]; // List of scope names like 'manage_horses', 'update_horses_own'
};

// Define the UserData type based on the structure of the user object
export type UserData = {
  userId: number;
  email: string;
  mobile: string;
  iat: number;
  exp: number;
  roles: Role[]; // An array of roles the user has
};

/**
 * What `event.context.user` actually holds.
 *
 * `server/middleware/auth.ts` resolves the bearer token and attaches the user
 * it identifies — but it never rejects a request (ADR-007). With no token, or
 * with a token it cannot verify, it attaches `null` and lets the route decide.
 * Every consumer therefore receives a value that may be absent, and typing it
 * as a bare `UserData` is what let an unauthenticated request reach
 * `userInfo.roles` and answer HTTP 500 (HOR-95).
 *
 * `UserData` itself stays non-nullable: an *authenticated* user always has
 * these fields. The uncertainty belongs to the context, not to the user.
 */
export type AuthContext = UserData | null | undefined;
