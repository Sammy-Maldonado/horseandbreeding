import { PrismaClient } from "@prisma/client";
import { createError, defineEventHandler, isError } from "h3";

import { PublicError, toPublicErrorResponse } from "../utils/publicError";
import { ensureAuthenticated } from "../utils/requireAuthorization";
import { USER_PROFILE_SELECT } from "../utils/userProfile";

const prisma = new PrismaClient();

/**
 * The authenticated profile read (HOR-98).
 *
 * The premium wizard prefills its contact step from here after the visitor
 * signs in through `/api/login`. Identity comes from the access token alone —
 * no email or password ever appears in this URL — and the row is looked up by
 * the token's own `userId`, so a caller can only ever read themselves.
 *
 * This replaces `user-by-email-pass`, which took a plaintext password in the
 * query string and echoed it back in its body. `USER_PROFILE_SELECT` is what
 * keeps the credential columns out of the response by construction.
 */
export default defineEventHandler(async (event) => {
  try {
    const user = ensureAuthenticated(event.context.user);

    const profile = await prisma.users.findUnique({
      select: USER_PROFILE_SELECT,
      where: { id: user.userId }
    });

    if (!profile) {
      // A valid token whose account no longer exists in the database.
      throw new PublicError("User profile not found.", 404);
    }

    return {
      statusCode: 200,
      message: "Successful..!",
      profile
    };
  } catch (error: unknown) {
    if (isError(error)) {
      // The 401 from ensureAuthenticated keeps its status untouched.
      throw error;
    }
    console.error("Reading the user profile failed:", error);
    throw createError(toPublicErrorResponse(error));
  }
});
