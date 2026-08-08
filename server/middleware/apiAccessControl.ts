import { createError, defineEventHandler } from "h3";

import { apiAccessDenial } from "../utils/apiAccessPolicy";

/**
 * Enforces the `/api` access classification recorded in
 * `docs/adr/ADR-007-api-authentication-trust-boundary.md`.
 *
 * The decision itself lives in `apiAccessPolicy.ts` and is tested there. This
 * file is the glue that turns it into an h3 response, and it `throw`s rather
 * than returning: a middleware that returns a value sends that value as the
 * body with status 200.
 */
export default defineEventHandler((event) => {
  const denial = apiAccessDenial(event.path);

  if (denial === null) {
    return;
  }

  throw createError(denial);
});
