import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { defineEventHandler, readBody } from "h3";

import { ACCESS_TOKEN_TTL_SECONDS, issueAccessToken } from "../utils/accessToken";
import { createRefreshSession } from "../utils/refreshSession";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event);

  try {
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
      throw new Error("Invalid email or password");
    }

    // 2. Validate the password.
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
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
    console.error("Login failed:", error);
    return {
      statusCode: 400,
      message: "Internal server error..!",
      statusMessage: "Bad request"
    };
  }
});
