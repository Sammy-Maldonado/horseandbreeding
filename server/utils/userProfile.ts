/**
 * The safe profile projection for the authenticated profile read (HOR-98).
 *
 * This is the only shape `/api/user-profile` may select and return. It exists
 * as a named constant so the guarantee is testable in the plain Node vitest
 * project: the credential columns are absent by construction, not by a handler
 * remembering to strip them.
 */

export const USER_PROFILE_SELECT = {
  email: true,
  first_name: true,
  last_name: true,
  town: true,
  countyId: true,
  address: true,
  mobile: true,
  zip_code: true,
  farmname: true
} as const;
