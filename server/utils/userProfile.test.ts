import { describe, expect, it } from "vitest";

import { USER_PROFILE_SELECT } from "./userProfile";

/**
 * HOR-98 — the authenticated profile read must never expose a credential.
 *
 * The legacy `user-by-email-pass` endpoint selected `password: true` and echoed
 * the submitted plaintext password back in its 200 body. Its replacement selects
 * through this constant, so these assertions are the durable statement that the
 * credential columns stay out of every profile response.
 */

describe("USER_PROFILE_SELECT", () => {
  it("selects exactly the wizard prefill fields", () => {
    expect(Object.keys(USER_PROFILE_SELECT).sort()).toEqual(
      [
        "address",
        "countyId",
        "email",
        "farmname",
        "first_name",
        "last_name",
        "mobile",
        "town",
        "zip_code"
      ].sort()
    );
  });

  it("never selects the password column", () => {
    expect(USER_PROFILE_SELECT).not.toHaveProperty("password");
  });

  it("only whitelists fields, never excludes them", () => {
    // A Prisma `select` with `false` values flips the meaning of the object;
    // every entry here must be an explicit opt-in.
    for (const value of Object.values(USER_PROFILE_SELECT)) {
      expect(value).toBe(true);
    }
  });
});
