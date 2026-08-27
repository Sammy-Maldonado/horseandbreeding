// The server-owned write contract for the public account endpoint (HOR-125,
// SEC-002).
//
// `PUT /api/user` is `public` in `API_ACCESS_POLICY` (ADR-007): the wizard
// reaches it with no JWT, authenticating an existing account with its password
// instead. It used to build its Prisma payload out of the caller's own object —
// `create: { ...userData, ... }` on create, and `userData` minus two deleted
// keys on update. Every other key the caller invented was written.
//
// That is mass assignment, and on `users` it is not cosmetic. The model carries
// account-classification scalars (`user_type`, `status`, `is_breeder`,
// `is_owner`, `is_stud`) and five relations — `roles`, `refresh_tokens`,
// `authorization_codes`, `users_has_storehorse`, `seller` — that Prisma accepts
// as nested writes on the same `data` object. The `roles` path reaches two
// levels down to `user_role_scope -> scope`, which is exactly the pair
// `ensureHasRoleAndScope` reads when it guards `addHorse`, `uploadImages`,
// `user-info`, `report-horses-ids` and `add-full-horse-details`.
//
// So the caller no longer describes the write. The server does: this module
// names the fields a public caller may set, validates each one against the
// column that stores it, and builds the Prisma payload itself.
//
// It imports neither `h3` nor Prisma, for the reason `registration.ts` and
// `publicError.ts` do not: the decision is then exhaustively testable in the
// plain Node vitest project, with no database and no Nuxt runtime. The handler
// turns a refusal into a real 400 with `createError` (HOR-96).

import { ValidationError } from "./publicError";

/**
 * The fields a public caller may write to their own account.
 *
 * Derived from the only caller — `components/RegisterUser.vue` builds
 * `form.data` from these eight and sends nothing else — and then owned here.
 * The two are deliberately separate things: what the UI happens to send today
 * is evidence, and this list is the decision. Adding a field is a decision
 * about who owns that column, not a reaction to a new caller.
 *
 * Everything else on `users` is server-owned, including every relation.
 */
export const PUBLIC_ACCOUNT_WRITE_FIELDS = [
  "first_name",
  "last_name",
  "town",
  "countyId",
  "address",
  "mobile",
  "zip_code",
  "farmname"
] as const;

/**
 * The credentials the server sources for itself.
 *
 * They are recognised rather than refused: the update path prefills the form
 * from `/api/user-profile`, whose projection includes `email` (HOR-98), so a
 * legitimate caller does send it back. The server takes the address from
 * `userInfo` and hashes its own password, so the copies in the profile object
 * are dropped instead of rejected.
 */
export const SERVER_OWNED_ACCOUNT_FIELDS = ["email", "password"] as const;

export type PublicAccountWriteField = (typeof PUBLIC_ACCOUNT_WRITE_FIELDS)[number];

export interface PublicAccountWrite {
  first_name?: string;
  last_name?: string;
  town?: string;
  countyId?: number;
  address?: string;
  mobile?: string;
  zip_code?: string | null;
  farmname?: string;
}

export interface AccountCreateData extends Required<PublicAccountWrite> {
  email: string;
  password: string;
}

/**
 * The width each text column is declared with in `prisma/schema.prisma`, and
 * whether it accepts NULL.
 *
 * Validating here rather than at the driver is what makes an over-long name the
 * caller's 400 instead of the server's 500 (CLAUDE.md §7, HOR-96).
 * `address` is `@db.Text`; 65535 is that column's real byte ceiling.
 */
const TEXT_COLUMNS: Record<string, { maxLength: number; nullable: boolean }> = {
  first_name: { maxLength: 50, nullable: false },
  last_name: { maxLength: 50, nullable: false },
  town: { maxLength: 50, nullable: false },
  address: { maxLength: 65_535, nullable: false },
  mobile: { maxLength: 45, nullable: false },
  zip_code: { maxLength: 50, nullable: true },
  farmname: { maxLength: 255, nullable: false }
};

/**
 * `countyId tinyint(4) NOT NULL DEFAULT 0`, and `counties.id` is `@db.TinyInt`
 * as well, so the whole legitimate range of a county reference is 0..127. 0 is
 * the column default and means "none chosen".
 */
const COUNTY_ID_MIN = 0;
const COUNTY_ID_MAX = 127;

/**
 * The row the schema would have produced for a caller that omitted a field.
 *
 * A create must still succeed on a partial profile, exactly as the spread
 * allowed, so the payload names every column and falls back to the default
 * `prisma/schema.prisma` declares for it. Naming them all is the point: the
 * create payload is a literal, not a copy of whatever arrived.
 */
const CREATE_DEFAULTS: Required<PublicAccountWrite> = {
  first_name: "",
  last_name: "",
  town: "",
  countyId: 0,
  address: "",
  mobile: "",
  zip_code: null,
  farmname: ""
};

/** Refusals name the field so the caller can fix it, and never quote its value. */
const refuse = (message: string): never => {
  throw new ValidationError(message);
};

function validateText(field: string, value: unknown): string | null {
  const column = TEXT_COLUMNS[field];

  if (value === null) {
    return column.nullable
      ? null
      : refuse(`The field ${field} cannot be empty. Please provide a value.`);
  }

  if (typeof value !== "string") {
    return refuse(`The field ${field} must be text. Please check and try again.`);
  }

  if (value.length > column.maxLength) {
    return refuse(
      `The field ${field} must be at most ${column.maxLength} characters long.`
    );
  }

  return value;
}

function validateCountyId(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return refuse("The field countyId must be a whole number identifying a county.");
  }

  if (value < COUNTY_ID_MIN || value > COUNTY_ID_MAX) {
    return refuse(
      `The field countyId must be between ${COUNTY_ID_MIN} and ${COUNTY_ID_MAX}.`
    );
  }

  return value;
}

/**
 * Reduces whatever the caller sent to the approved contract.
 *
 * Fail-closed: an unapproved key is a 400 rather than a silent strip, because a
 * caller that sends `user_type` is either mistaken or probing, and both deserve
 * a straight answer. The only exception is the credential pair above, which a
 * legitimate caller genuinely round-trips.
 *
 * A `null` or absent body is an empty write, not an error. Whether a profile is
 * required at all is the handler's decision; this one only decides what may be
 * written.
 */
export function toPublicAccountWrite(input: unknown): PublicAccountWrite {
  if (input === null || input === undefined) {
    return {};
  }

  if (typeof input !== "object" || Array.isArray(input)) {
    return refuse("The account details must be an object.");
  }

  const source = input as Record<string, unknown>;
  const approved = new Set<string>(PUBLIC_ACCOUNT_WRITE_FIELDS);
  const serverOwned = new Set<string>(SERVER_OWNED_ACCOUNT_FIELDS);
  const write: PublicAccountWrite = {};

  for (const [key, value] of Object.entries(source)) {
    if (serverOwned.has(key)) {
      continue;
    }

    if (!approved.has(key)) {
      // Names the key, never the value (CLAUDE.md §7).
      refuse(`The field ${key} cannot be set on an account.`);
    }

    if (value === undefined) {
      continue;
    }

    if (key === "countyId") {
      write.countyId = validateCountyId(value);
      continue;
    }

    // Every remaining approved field is a text column.
    (write as Record<string, unknown>)[key] = validateText(key, value);
  }

  return write;
}

/**
 * The create payload, named field by field.
 *
 * The email and the hash come from the handler — the caller's copies were
 * dropped upstream — so no caller-supplied value can reach a credential column.
 */
export function toAccountCreateData(
  input: unknown,
  email: string,
  hashedPassword: string
): AccountCreateData {
  const write = toPublicAccountWrite(input);

  return {
    email,
    password: hashedPassword,
    first_name: write.first_name ?? CREATE_DEFAULTS.first_name,
    last_name: write.last_name ?? CREATE_DEFAULTS.last_name,
    town: write.town ?? CREATE_DEFAULTS.town,
    countyId: write.countyId ?? CREATE_DEFAULTS.countyId,
    address: write.address ?? CREATE_DEFAULTS.address,
    mobile: write.mobile ?? CREATE_DEFAULTS.mobile,
    zip_code: write.zip_code ?? CREATE_DEFAULTS.zip_code,
    farmname: write.farmname ?? CREATE_DEFAULTS.farmname
  };
}

/**
 * The update payload: only the approved fields the caller actually sent.
 *
 * Unlike create, an omitted field must stay omitted. Falling back to a default
 * here would blank a stored value the caller never mentioned.
 */
export function toAccountUpdateData(input: unknown): PublicAccountWrite {
  const write = toPublicAccountWrite(input);
  const data: PublicAccountWrite = {};

  if (write.first_name !== undefined) data.first_name = write.first_name;
  if (write.last_name !== undefined) data.last_name = write.last_name;
  if (write.town !== undefined) data.town = write.town;
  if (write.countyId !== undefined) data.countyId = write.countyId;
  if (write.address !== undefined) data.address = write.address;
  if (write.mobile !== undefined) data.mobile = write.mobile;
  if (write.zip_code !== undefined) data.zip_code = write.zip_code;
  if (write.farmname !== undefined) data.farmname = write.farmname;

  return data;
}
