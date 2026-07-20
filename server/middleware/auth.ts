import { defineEventHandler } from "h3";
import { verifyToken } from "../utils/verifyToken";
import { H3Event } from "h3"; // Import types for H3 event
import { PrismaClient } from "@prisma/client";
import type { UserData } from "../utils/types";
const prisma = new PrismaClient();

export default defineEventHandler(async (event: H3Event) => {
  const { headers } = event.req;
  const token = headers["authorization"]?.split(" ")[1];

  if (token) {
    try {
      // Assuming verifyToken returns a Promise<unknown>
      const userData = (await verifyToken(token)) as UserData;

      // Fetch user's roles from the database using Prisma
      const userRoles = await prisma.user_roles.findMany({
        where: {
          user_id: userData.userId
        },
        include: {
          user_role_scope: {
            include: {
              scope: true
            }
          }
        }
      });

      // Attach user roles to the event context
      event.context.user = {
        ...userData,
        roles: userRoles.map((role) => ({
          roleName: role.role_name,
          scopes: role.user_role_scope.map((scope) => scope.scope.scope_name) // Adjust to your scope field name
        }))
      };
    } catch (err) {
      event.context.user = null; // If token is invalid, set user to null
      console.error("Token verification failed:", err);
    }
  } else {
    event.context.user = null; // No token found, set user to null
  }
});

// import { defineEventHandler } from 'h3';
// import { verifyToken } from '../utils/verifyToken';
// import { H3Event } from 'h3'; // Import types for H3 event

// export default defineEventHandler(async (event: H3Event) => {
//   // const token = event.node.req.headers['authorization'];
// // API Key validation
// const { headers } = event.req;
// // console.log( "url", url );
// const token = headers['authorization']?.split(' ')[1];
//   if (token) {
//     try {
//       const userData = await verifyToken(token);
//       event.context.user = userData; // Set user data in the context
//     } catch (err) {
//       event.context.user = null; // If token is invalid, set user to null
//       console.error('Token verification failed:', err);
//     }
//   } else {
//     event.context.user = null; // No token found, set user to null
//   }
// });
