import { describe, expect, it } from "vitest";

import { PublicError, toPublicErrorResponse, ValidationError } from "./publicError";

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
      statusCode: 500,
      message: "Internal server error..!",
      statusMessage: "Bad request"
    });
  });

  // HOR-96: a failure the server caused is not a bad client request.
  it("reports an internal failure as 500, not 400", () => {
    expect(toPublicErrorResponse(new Error("connection reset")).statusCode).toBe(
      500
    );
  });

  it("carries the status a PublicError was raised with", () => {
    expect(
      toPublicErrorResponse(
        new PublicError("Invalid email or password.", 401)
      )
    ).toEqual({
      statusCode: 401,
      message: "Internal server error..!",
      statusMessage: "Invalid email or password."
    });
  });

  it("lets a conflict be reported as 409", () => {
    expect(
      toPublicErrorResponse(
        new PublicError("An account with this email already exists.", 409)
      ).statusCode
    ).toBe(409);
  });

  it("defaults a PublicError with no explicit status to 400", () => {
    expect(toPublicErrorResponse(new PublicError("Missing name.")).statusCode).toBe(
      400
    );
  });

  it("keeps ValidationError working as the 400 it has always been", () => {
    const error = new ValidationError("Passwords do not match.");

    expect(error).toBeInstanceOf(PublicError);
    expect(toPublicErrorResponse(error).statusCode).toBe(400);
  });
});
