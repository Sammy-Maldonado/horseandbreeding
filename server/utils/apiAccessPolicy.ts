/**
 * Per-route access classification for `/api`.
 *
 * Authoritative decision: `docs/adr/ADR-007-api-authentication-trust-boundary.md`.
 *
 * The browser and the Nitro server share an origin, so no shared secret can be
 * secret: anything the browser must send, every visitor already has. Access is
 * therefore decided per route and stated here explicitly, rather than inferred
 * from a credential that the client bundle carries in plain text.
 *
 *   public         callable by anyone, no credential
 *   authenticated  a valid JWT must identify a user, any role
 *   role-scoped    a valid JWT plus a named role and scope, enforced in the
 *                  handler via `ensureHasRoleAndScope`
 *   server-only    not routable from the browser at all
 *
 * A route absent from this map is treated as `server-only`. Adding a handler
 * without classifying it therefore fails loudly instead of quietly inheriting
 * public access — and `apiAccessPolicy.test.ts` fails the build before that can
 * reach a running server.
 */

export type ApiAccessLevel =
  | "public"
  | "authenticated"
  | "role-scoped"
  | "server-only";

export const API_ACCESS_POLICY: Readonly<Record<string, ApiAccessLevel>> = {
  // --- Role-scoped: JWT plus role and scope, enforced inside the handler ----
  addHorse: "role-scoped",
  "add-full-horse-details": "role-scoped",
  "report-horses-ids": "role-scoped",
  uploadImages: "role-scoped",
  "user-info": "role-scoped",

  // --- Public: credential exchange -----------------------------------------
  // These authenticate their own caller and cannot require a prior credential.
  login: "public",
  "refresh-token": "public",

  // --- Public: self-service account and submission flows --------------------
  // Each is reached from a page with no login step. Requiring a JWT would break
  // the flow the route exists to serve.
  "sign-up": "public",
  user: "public",
  "user-by-email-pass": "public",
  vendor: "public",
  "create-payment-intent": "public",

  // --- Public: reference and catalogue reads --------------------------------
  // Pedigree, horse and reference data the public site renders for anonymous
  // visitors. No page in the application guards any of it.
  areas: "public",
  breeder: "public",
  colors: "public",
  "colors-sexes-studbooks": "public",
  counties: "public",
  diciplinevalues: "public",
  "edit-horse-by-id": "public",
  "family-tree-of-horse-by-id": "public",
  familyHorseStore: "public",
  "filter-horses-by-name": "public",
  "filter-horses-by-name-sex": "public",
  "find-many-disciplines": "public",
  gender: "public",
  horse: "public",
  "horse-sells": "public",
  "horse-sells-count": "public",
  "horses-suggested-for-sale": "public",
  mareline: "public",
  "pagination-horses-by-name": "public",
  "pagination-horses-by-name-sex": "public",
  pedigree: "public",
  "pedigree-detail": "public",
  progeny: "public",
  search: "public",
  "search-pages": "public",
  "store-horse-info-id": "public",
  storeHorseById: "public",
  storehorseNames: "public",
  storehorses: "public",
  studbook: "public",

  // --- Server-only: never reachable from the browser ------------------------
  // `send-email` sends mail from the project's SMTP account using a body-supplied
  // recipient, subject and text. `events` echoes and logs the request body.
  // Neither has a client caller.
  "send-email": "server-only",
  events: "server-only",
};

/**
 * The route name Nitro serves a request under, or `null` when the request is
 * not an `/api` request at all.
 *
 * `/api/vendor?name=x` and `/api/vendor/` both resolve to `vendor`; `/apixyz`
 * resolves to nothing.
 */
export function routeNameFromUrl(url: string): string | null {
  const path = url.split("?")[0].split("#")[0];

  if (!path.startsWith("/api/")) {
    return null;
  }

  const name = path.slice("/api/".length).replace(/\/+$/, "");

  return name.length > 0 ? name : null;
}

/**
 * Whether an `/api` path belongs to a Nuxt module rather than to this
 * application.
 *
 * A leading underscore on the first segment is the framework's own convention
 * for the paths a module registers for itself. Those routes are the module's to
 * govern; this policy classifies only the surface the application owns in
 * `server/api`, where no route name begins with an underscore.
 *
 * No module currently installed registers such a route. `@nuxt/content` did,
 * under `/api/_content/**`, and was removed once it was confirmed to serve no
 * content. The rule stays because it belongs to the framework rather than to
 * that module: a module added later inherits it without reopening this file.
 */
export function isModuleOwnedApiPath(url: string): boolean {
  const name = routeNameFromUrl(url);

  return name !== null && name.startsWith("_");
}

/**
 * The access level for a request URL, or `null` when this policy does not
 * govern it — either because it is not an `/api` request, or because a module
 * owns it.
 *
 * An unknown route the application *does* own is denied rather than allowed.
 */
export function classifyApiRoute(url: string): ApiAccessLevel | null {
  const name = routeNameFromUrl(url);

  if (name === null || isModuleOwnedApiPath(url)) {
    return null;
  }

  return API_ACCESS_POLICY[name] ?? "server-only";
}

/** Whether a browser may reach a route at this level. */
export function isBrowserReachable(level: ApiAccessLevel): boolean {
  return level !== "server-only";
}

/** The response a refused request must receive. */
export interface ApiAccessDenial {
  statusCode: number;
  statusMessage: string;
}

/**
 * Whether an incoming request must be refused before any handler runs, decided
 * from the request path alone.
 *
 * Only `server-only` routes are refused here. `role-scoped` routes pass through
 * and are enforced where they always were — inside the handler, via
 * `ensureHasRoleAndScope`, against the JWT that `auth.ts` resolved into
 * `event.context.user`.
 *
 * A refusal answers `404`, not `403`: a route the caller may not reach should
 * not confirm that it exists.
 *
 * No credential is read. The check this replaces compared a header the browser
 * sent against a value the server held, and both were the same string shipped
 * in the client bundle; see ADR-007.
 */
export function apiAccessDenial(url: string): ApiAccessDenial | null {
  const level = classifyApiRoute(url);

  if (level === null || isBrowserReachable(level)) {
    return null;
  }

  return { statusCode: 404, statusMessage: "Not Found" };
}
