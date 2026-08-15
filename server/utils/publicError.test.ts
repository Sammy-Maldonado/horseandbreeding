import { describe, expect, it } from "vitest";

import { toPublicErrorResponse, ValidationError } from "./publicError";

describe("toPublicErrorResponse", () => {
  it("passes an intentional validation message through unchanged", () => {
    const response = toPublicErrorResponse(
      new ValidationError(
        "An account with this email already exists in the registry."
      )
    );

    expect(response).toEqual({
      statusCode: 400,
      message: "Internal server error..!",
      statusMessage:
        "An account with this email already exists in the registry."
    });
  });

  it("generalises an internal Prisma-style error to a fixed message with no schema detail", () => {
    const response = toPublicErrorResponse(
      new Error(
        "Invalid `prisma.user_roles.upsert()` invocation:\n\n" +
          "The table `user_roles` does not exist in the current database."
      )
    );

    expect(response.statusMessage).toBe("Bad request");
    const body = JSON.stringify(response).toLowerCase();
    expect(body).not.toContain("prisma");
    expect(body).not.toContain("upsert");
    expect(body).not.toContain("user_roles");
    expect(body).not.toContain("table");
  });

  it("generalises a non-Error throw to the same fixed message", () => {
    const response = toPublicErrorResponse("something exploded");

    expect(response).toEqual({
      statusCode: 400,
      message: "Internal server error..!",
      statusMessage: "Bad request"
    });
  });
});
