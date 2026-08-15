import { PrismaClient } from "@prisma/client";
import { defineEventHandler, readBody } from "h3";

import { ACCESS_TOKEN_TTL_SECONDS, issueAccessToken } from "../utils/accessToken";
import {
  RefreshSessionError,
  rotateRefreshSession
} from "../utils/refreshSession";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const { refreshToken } = await readBody(event);
    if (typeof refreshToken !== "string" || refreshToken.length === 0) {
      return {
        statusCode: 400,
        message: "Invalid refresh access token..!",
        statusMessage: "Bad request"
      };
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
      return {
        statusCode: 400,
        message: "Invalid refresh access token..!",
        statusMessage: "Bad request"
      };
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
      return {
        statusCode: 400,
        message: "Invalid refresh access token..!",
        statusMessage: "Bad request"
      };
    }
    console.error("Refresh failed:", error);
    return {
      statusCode: 400,
      message: "Internal server error..!",
      statusMessage: "Bad request"
    };
  }
});
