import { PrismaClient } from "@prisma/client";
import { createError, defineEventHandler, isError, readBody } from "h3";

import { ACCESS_TOKEN_TTL_SECONDS, issueAccessToken } from "../utils/accessToken";
import {
  RefreshSessionError,
  rotateRefreshSession
} from "../utils/refreshSession";

const prisma = new PrismaClient();

// Every way a refresh can be refused looks the same from outside: the caller
// must sign in again. Which of them happened stays in the server log.
const REJECTED = "Invalid refresh access token..!";

export default defineEventHandler(async (event) => {
  try {
    const { refreshToken } = await readBody(event);
    if (typeof refreshToken !== "string" || refreshToken.length === 0) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
        message: REJECTED
      });
    }

    // Rotate first: the supplied credential is redeemed exactly once. The
    // old session row is replaced by the new one inside a single
    // transaction, so replaying the old credential afterwards is rejected.
    const rotated = await rotateRefreshSession(prisma, refreshToken);

    const user = await prisma.users.findUnique({
      select: { id: true, email: true, mobile: true },
      where: { id: rotated.userId }
    });
    if (!user) {
      // The session pointed at a user that no longer exists.
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
        message: REJECTED
      });
    }

    const accessToken = issueAccessToken(user);

    return {
      statusCode: 200,
      message: "Successful..!",
      accessToken: accessToken,
      refreshToken: rotated.refreshToken,
      expires_in: ACCESS_TOKEN_TTL_SECONDS
    };
  } catch (error) {
    if (error instanceof RefreshSessionError) {
      // INVALID (unknown or replayed credential) and EXPIRED both surface as
      // the same generic rejection; the distinction stays server-side.
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
        message: REJECTED
      });
    }
    if (isError(error)) {
      // A refusal decided above must keep the status it was raised with.
      throw error;
    }
    console.error("Refresh failed:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      message: "Internal server error..!"
    });
  }
});
