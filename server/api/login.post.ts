import { PrismaClient } from "../../generated/prisma/client";
import { createMariaDbAdapter } from "../utils/prismaAdapter";
import bcrypt from "bcrypt";
import { createError, defineEventHandler, readBody } from "h3";

import { ACCESS_TOKEN_TTL_SECONDS, issueAccessToken } from "../utils/accessToken";
import { PublicError, toPublicErrorResponse } from "../utils/publicError";
import { createRefreshSession } from "../utils/refreshSession";

const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });

// One message for both "no such email" and "wrong password", so a caller
// cannot use the response to discover which addresses are registered.
const INVALID_CREDENTIALS = "Invalid email or password.";

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null);
  const email = body?.email;
  const password = body?.password;

  try {
    // Prisma reads `where: { email: undefined }` as "no filter", so a missing
    // field matched the first user in the table and only failed later inside
    // bcrypt — reported as a 500. A missing credential is the caller's mistake,
    // and it is answered before any lookup runs (HOR-96).
    if (typeof email !== "string" || typeof password !== "string") {
      throw new PublicError("Email and password are required.", 400);
    }

    // 1. Find the user by email.
    const user = await prisma.users.findFirst({
      select: {
        email: true,
        mobile: true,
        id: true,
        password: true
      },
      where: { email: email }
    });
    if (!user) {
      throw new PublicError(INVALID_CREDENTIALS, 401);
    }

    // 2. Validate the password.
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new PublicError(INVALID_CREDENTIALS, 401);
    }

    // 3. Access token: short-lived stateless JWT with a unique jti. It is
    //    returned to the client and never persisted — see ADR-013.
    const accessToken = issueAccessToken(user);

    // 4. Refresh session: opaque random credential; only its SHA-256 digest
    //    reaches the database.
    const refreshToken = await createRefreshSession(prisma, user.id);

    return {
      statusCode: 200,
      message: "Successful..!",
      accessToken: accessToken,
      refreshToken: refreshToken,
      expires_in: ACCESS_TOKEN_TTL_SECONDS
    };
  } catch (error) {
    // A rejected credential is a 401 the caller can act on; anything else is
    // our failure and stays a 500 with no internal detail (HOR-96).
    console.error("Login failed:", error);
    throw createError(toPublicErrorResponse(error));
  }
});
