import { PrismaClient } from "../../generated/prisma/client";
import { createMariaDbAdapter } from "../utils/prismaAdapter";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createError, defineEventHandler } from "h3";
import { PublicError, toPublicErrorResponse } from "../utils/publicError";
import { ensureHasRoleAndScope } from "../utils/requireAuthorization";
const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });

export default defineEventHandler(async (event) => {
  // Refuses the caller before any work is done: 401 when the request carries
  // no verifiable token, 403 when the user lacks the role or the scope.
  const userInfo = ensureHasRoleAndScope(
    event.context.user,
    ["Admin", "Seller"],
    "create_horses"
  );

  // return userInfo;
  try {
    const user = await prisma.users.findUnique({
      select: {
        email: true,
        mobile: true,
        first_name: true,
        last_name: true
      },
      where: {
        email: userInfo.email,
        id: userInfo.userId,
        mobile: userInfo.mobile
      }
    });

    if (!user) {
      // The token is valid but the account behind it is gone.
      throw new PublicError(
        "User not found. Please verify your credentials or contact support if the issue persists.",
        404
      );
    }

    return {
      statusCode: 200,
      message: "Successful..!",
      data: JSON.stringify(user)
    };
  } catch (error: unknown) {
    // The raw message used to be echoed here, which handed the client whatever
    // Prisma had to say about the schema (CLAUDE.md §7).
    console.error("user-info failed:", error);
    throw createError(toPublicErrorResponse(error));
  }
});

// const manageHorsesScope = await prisma.scopes.create({
//   data: {
//     scope_name: 'create_horses',
//     description: 'Ability to create horses (create)',
//   },
// });

// const validateHorsesScope = await prisma.scopes.create({
//   data: {
//     scope_name: 'update_horses_own',
//     description: 'Ability to upgrade your own horse ( update ) horses',
//   },
// });

// // Create Roles and Assign Scopes
// const sellerRole = await prisma.user_roles.create({
//   data: {
//     role_name: 'Seller',
//     user_id:userInfo.userId,
//     user_role_scope: {
//       create: [
//         { scope: { connect: { id: manageHorsesScope.id } } },
//         { scope: { connect: { id: validateHorsesScope.id } } },
//       ],
//     },
//   },
// });
