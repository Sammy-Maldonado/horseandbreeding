import { describe, expect, it } from "vitest";

import { hasRoleAndScope } from "./authorization";
import { PublicError } from "./publicError";
import {
  PUBLIC_ACCOUNT_WRITE_FIELDS,
  SERVER_OWNED_ACCOUNT_FIELDS,
  toAccountCreateData,
  toAccountUpdateData,
  toPublicAccountWrite
} from "./publicAccountWrite";

/**
 * HOR-125 (SEC-002) — the public account write contract.
 *
 * `PUT /api/user` is classified `public` in `API_ACCESS_POLICY` (ADR-007): it
 * is the wizard's registration / profile-update endpoint and it authenticates
 * with the account password rather than a JWT. Before this issue it built its
 * Prisma payload from the caller's own object:
 *
 *   create: { ...userData, email, password: hashedPassword }
 *   update: (delete userData.password; delete userData.email) -> userData
 *
 * Two keys were stripped; every other key the caller invented was written. The
 * `users` model carries account-classification scalars (`user_type`, `status`,
 * `is_breeder`, `is_owner`, `is_stud`) and five relations (`roles`,
 * `refresh_tokens`, `authorization_codes`, `users_has_storehorse`, `seller`)
 * that Prisma accepts as nested writes on that same `data` object — including
 * the two-level `roles -> user_role_scope -> scope` path, which is precisely
 * what `ensureHasRoleAndScope` reads.
 *
 * This module is the server-owned contract that replaced the spread. It stays
 * free of `h3` and of Prisma for the same reason `registration.ts` and
 * `publicError.ts` do: the decision is then exhaustively testable in the plain
 * Node vitest project, with no database and no Nuxt runtime.
 */

/** The eight fields `components/RegisterUser.vue` actually sends. */
const legitimatePayload = {
  first_name: "Marcus",
  last_name: "Byrne",
  town: "Kilkenny",
  countyId: 12,
  address: "1 Paddock Lane",
  mobile: "0871234567",
  zip_code: "R95 X1Y2",
  farmname: "Ashfield Stud"
};

/** The forged scalars the audit named, none of which a caller may set. */
const forgedScalars = {
  user_type: 1,
  status: 1,
  is_breeder: 1,
  is_owner: 1,
  is_stud: 1
};

/**
 * The escalation payload, verified to be accepted by the Prisma query
 * validator against the real generated client — it fails only when the client
 * tries to open a connection, which is one step past shape validation.
 */
const forgedRelations = {
  roles: {
    create: [
      {
        role_name: "Admin",
        user_role_scope: {
          create: [
            {
              scope: {
                connectOrCreate: {
                  where: { scope_name: "create_horses" },
                  create: {
                    scope_name: "create_horses",
                    description: "forged"
                  }
                }
              }
            }
          ]
        }
      }
    ]
  }
};

describe("the contract itself", () => {
  it("is exactly the field set the registration wizard sends", () => {
    // `components/RegisterUser.vue` builds `form.data` from these eight and
    // nothing else. The contract is derived from the caller, then owned by the
    // server — a new caller field is a decision, not an accident.
    expect([...PUBLIC_ACCOUNT_WRITE_FIELDS]).toEqual([
      "first_name",
      "last_name",
      "town",
      "countyId",
      "address",
      "mobile",
      "zip_code",
      "farmname"
    ]);
  });

  it("names the credentials the server owns and the caller cannot supply", () => {
    expect([...SERVER_OWNED_ACCOUNT_FIELDS]).toEqual(["email", "password"]);
  });

  it("never overlaps the two", () => {
    for (const field of SERVER_OWNED_ACCOUNT_FIELDS) {
      expect(PUBLIC_ACCOUNT_WRITE_FIELDS).not.toContain(field);
    }
  });
});

describe("what the defect allowed, and what the contract now refuses", () => {
  /**
   * The pre-fix route logic, reproduced verbatim. It is kept as executable
   * documentation: the contrast below is the regression guard, so a reader can
   * see what was written before and what is written now.
   */
  const legacyCreateData = (userData: Record<string, unknown>) => ({
    ...userData,
    email: "marcus@example.test",
    password: "<hash>"
  });

  const legacyUpdateData = (userData: Record<string, unknown>) => {
    const copy = { ...userData };
    delete copy.password;
    delete copy.email;
    return copy;
  };

  const forgedPayload = {
    ...legitimatePayload,
    ...forgedScalars,
    ...forgedRelations
  };

  it("wrote every forged scalar on create, and no longer accepts them", () => {
    expect(legacyCreateData(forgedPayload)).toMatchObject(forgedScalars);

    expect(() => toAccountCreateData(forgedPayload, "marcus@example.test", "<hash>")).toThrow(
      PublicError
    );
  });

  it("wrote every forged scalar on update, and no longer accepts them", () => {
    expect(legacyUpdateData(forgedPayload)).toMatchObject(forgedScalars);

    expect(() => toAccountUpdateData(forgedPayload)).toThrow(PublicError);
  });

  it("carried the nested role and scope write through on create", () => {
    // This is the payload the Prisma validator accepted against the real
    // generated client. It reached `prisma.users.upsert` unaltered.
    expect(legacyCreateData(forgedPayload)).toHaveProperty("roles");

    expect(() => toAccountCreateData(forgedPayload, "marcus@example.test", "<hash>")).toThrow(
      PublicError
    );
  });

  it("carried the nested role and scope write through on update", () => {
    expect(legacyUpdateData(forgedPayload)).toHaveProperty("roles");

    expect(() => toAccountUpdateData(forgedPayload)).toThrow(PublicError);
  });

  it("granted the exact role and scope the guarded endpoints demand", () => {
    // Why the nested write mattered, proven against the real decision function
    // rather than described. `hasAnyRole` and `hasScope` are two independent
    // `.some()` passes over the roles array, so the forged "Admin" row and the
    // forged "create_horses" scope satisfy both halves at once — and that pair
    // is what every role-scoped handler asks for:
    // `ensureHasRoleAndScope(user, ["Admin", "Seller"], "create_horses")`.
    const escalated = {
      roles: [
        { roleName: "User", scopes: ["user_read"] },
        { roleName: "Admin", scopes: ["create_horses"] }
      ]
    };

    expect(
      hasRoleAndScope(escalated as never, ["Admin", "Seller"], "create_horses")
    ).toBe(true);

    // A legitimately registered account holds only the role and scope
    // `registration.ts` grants, and is refused.
    const registered = { roles: [{ roleName: "User", scopes: ["user_read"] }] };

    expect(
      hasRoleAndScope(registered as never, ["Admin", "Seller"], "create_horses")
    ).toBe(false);
  });
});

describe("toPublicAccountWrite — the allowlist", () => {
  it("keeps every approved field the caller sent", () => {
    expect(toPublicAccountWrite(legitimatePayload)).toEqual(legitimatePayload);
  });

  it("omits an approved field the caller did not send", () => {
    const { farmname, zip_code, ...partial } = legitimatePayload;

    expect(toPublicAccountWrite(partial)).toEqual(partial);
  });

  it("treats an absent body as an empty write rather than an error", () => {
    // The route decides whether a missing profile is acceptable; the contract
    // only decides what may be written.
    expect(toPublicAccountWrite(undefined)).toEqual({});
    expect(toPublicAccountWrite(null)).toEqual({});
    expect(toPublicAccountWrite({})).toEqual({});
  });

  it.each([
    ["user_type", { user_type: 1 }],
    ["status", { status: 1 }],
    ["is_breeder", { is_breeder: 1 }],
    ["is_owner", { is_owner: 1 }],
    ["is_stud", { is_stud: 1 }],
    ["welcome", { welcome: "x" }],
    ["news", { news: "x" }],
    ["logo", { logo: "x" }],
    ["question", { question: "x" }],
    ["answer", { answer: "x" }],
    ["telephone", { telephone: "x" }],
    ["website", { website: "x" }],
    ["googlemap", { googlemap: "x" }],
    ["id", { id: 1 }]
  ])("refuses the unapproved scalar %s", (_label, forged) => {
    expect(() => toPublicAccountWrite({ ...legitimatePayload, ...forged })).toThrow(
      PublicError
    );
  });

  it.each([
    ["roles", { roles: { create: [{ role_name: "Admin" }] } }],
    ["refresh_tokens", { refresh_tokens: { create: [{ token: "x" }] } }],
    ["authorization_codes", { authorization_codes: { create: [{ code: "x" }] } }],
    ["users_has_storehorse", { users_has_storehorse: { create: [{ horse_id: 1 }] } }],
    ["seller", { seller: { create: [{ full_name: "Eve" }] } }]
  ])("refuses the nested relation write %s", (_label, forged) => {
    expect(() => toPublicAccountWrite({ ...legitimatePayload, ...forged })).toThrow(
      PublicError
    );
  });

  it("refuses an unapproved field with 400, not 500", () => {
    // Fail-closed and truthful: an invented key is the caller's mistake.
    try {
      toPublicAccountWrite({ user_type: 1 });
      expect.unreachable("an unapproved field must be refused");
    } catch (error) {
      expect(error).toBeInstanceOf(PublicError);
      expect((error as PublicError).statusCode).toBe(400);
    }
  });

  it("names the offending field without echoing its value", () => {
    // The caller has to be able to fix the request; the server must not quote
    // input back into a response (CLAUDE.md §7).
    try {
      toPublicAccountWrite({ user_type: "<script>" });
      expect.unreachable("an unapproved field must be refused");
    } catch (error) {
      expect((error as PublicError).message).toContain("user_type");
      expect((error as PublicError).message).not.toContain("<script>");
    }
  });

  it("ignores the credentials the server owns instead of refusing them", () => {
    // The update path prefills `form.data` from `/api/user-profile`, whose
    // projection includes `email`. That is a legitimate caller sending a field
    // the server sources itself — it is dropped, not rejected (HOR-98).
    expect(
      toPublicAccountWrite({
        ...legitimatePayload,
        email: "someone.else@example.test",
        password: "forged"
      })
    ).toEqual(legitimatePayload);
  });
});

describe("toPublicAccountWrite — per-field validation", () => {
  it.each([
    ["first_name", 50],
    ["last_name", 50],
    ["town", 50],
    ["mobile", 45],
    ["zip_code", 50],
    ["farmname", 255]
  ])("refuses %s longer than the column's %i characters", (field, width) => {
    // An over-long value used to reach the driver and come back as a 500.
    expect(() =>
      toPublicAccountWrite({ ...legitimatePayload, [field]: "a".repeat(width + 1) })
    ).toThrow(PublicError);

    expect(
      toPublicAccountWrite({ ...legitimatePayload, [field]: "a".repeat(width) })
    ).toMatchObject({ [field]: "a".repeat(width) });
  });

  it.each(["first_name", "last_name", "town", "address", "mobile", "farmname"])(
    "refuses a non-string %s",
    (field) => {
      for (const value of [1, true, null, {}, []]) {
        expect(() =>
          toPublicAccountWrite({ ...legitimatePayload, [field]: value })
        ).toThrow(PublicError);
      }
    }
  );

  it("accepts an empty string for an optional text field", () => {
    // Every one of these columns is NOT NULL DEFAULT '' — blank is a value.
    expect(toPublicAccountWrite({ ...legitimatePayload, farmname: "" })).toMatchObject({
      farmname: ""
    });
  });

  it("accepts null only for the one nullable column", () => {
    expect(toPublicAccountWrite({ ...legitimatePayload, zip_code: null })).toMatchObject({
      zip_code: null
    });

    expect(() =>
      toPublicAccountWrite({ ...legitimatePayload, farmname: null })
    ).toThrow(PublicError);
  });

  it("refuses a countyId outside the tinyint column it is stored in", () => {
    // `countyId tinyint(4) NOT NULL DEFAULT 0`, and `counties.id` is TinyInt
    // too, so 0..127 is the whole legitimate range.
    expect(toPublicAccountWrite({ countyId: 0 })).toEqual({ countyId: 0 });
    expect(toPublicAccountWrite({ countyId: 127 })).toEqual({ countyId: 127 });

    for (const value of [-1, 128, 1.5, "12", null, true]) {
      expect(() => toPublicAccountWrite({ countyId: value })).toThrow(PublicError);
    }
  });

  it("refuses an address longer than the TEXT column holds", () => {
    expect(() =>
      toPublicAccountWrite({ ...legitimatePayload, address: "a".repeat(65_536) })
    ).toThrow(PublicError);
  });
});

describe("toAccountCreateData", () => {
  it("writes the credentials the server supplied, never the caller's", () => {
    const data = toAccountCreateData(
      { ...legitimatePayload, email: "forged@example.test", password: "forged" },
      "marcus@example.test",
      "<hash>"
    );

    expect(data.email).toBe("marcus@example.test");
    expect(data.password).toBe("<hash>");
  });

  it("writes the approved profile fields", () => {
    const data = toAccountCreateData(legitimatePayload, "marcus@example.test", "<hash>");

    expect(data).toMatchObject(legitimatePayload);
  });

  it("has no key outside the contract", () => {
    const data = toAccountCreateData(legitimatePayload, "marcus@example.test", "<hash>");

    expect(Object.keys(data).sort()).toEqual(
      [...PUBLIC_ACCOUNT_WRITE_FIELDS, ...SERVER_OWNED_ACCOUNT_FIELDS].sort()
    );
  });

  it("falls back to the column defaults for anything the caller omitted", () => {
    // Registration must still succeed for a caller that sends a partial
    // profile, exactly as the spread allowed. The values are the schema's own
    // defaults, so the row is identical to the one Prisma would have built.
    const data = toAccountCreateData({}, "marcus@example.test", "<hash>");

    expect(data).toEqual({
      email: "marcus@example.test",
      password: "<hash>",
      first_name: "",
      last_name: "",
      town: "",
      countyId: 0,
      address: "",
      mobile: "",
      zip_code: null,
      farmname: ""
    });
  });
});

describe("toAccountUpdateData", () => {
  it("writes only the approved fields the caller actually sent", () => {
    // An update must never widen into the fields it was not given: writing a
    // default over an absent key would blank a stored value.
    expect(toAccountUpdateData({ town: "Naas" })).toEqual({ town: "Naas" });
  });

  it("is empty for a caller that sent no profile at all", () => {
    expect(toAccountUpdateData({})).toEqual({});
    expect(toAccountUpdateData(undefined)).toEqual({});
  });

  it("never carries a credential, even one the caller supplied", () => {
    const data = toAccountUpdateData({
      town: "Naas",
      email: "forged@example.test",
      password: "forged"
    });

    expect(data).toEqual({ town: "Naas" });
  });

  it("has no key outside the contract", () => {
    const data = toAccountUpdateData(legitimatePayload);

    expect(Object.keys(data).sort()).toEqual([...PUBLIC_ACCOUNT_WRITE_FIELDS].sort());
  });
});
