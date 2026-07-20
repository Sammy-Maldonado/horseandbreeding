import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { defineEventHandler } from "h3";
const prisma = new PrismaClient();
// Function to hash a password
const saltRounds = 10; // Determines the complexity of the hashing
async function hashPassword(password: any) {
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (err) {
    console.error("Error hashing password:", err);
    throw new Error("Failed to hash password, contact with support ");
  }
}
export default defineEventHandler(async (event) => {
  try {
    // @ts-ignore1
    const {
      email,
      first_name,
      last_name,
      town,
      countyId,
      password,
      confirm_password,
      address,
      mobile,
      zip_code,
      farmname
    } = await readBody(event);

    if (password !== confirm_password || password?.length < 8) {
      throw new Error(
        "Passwords do not match or must be at least 8 characters long. Please check and try again."
      );
    }
    const findUser = await prisma.users.findUnique({
      where: { email: email }
    });
    if (findUser) {
      throw new Error(
        "An account with this email already exists in the registry."
      );
    }
    // Step 1: Hash the new password using bcrypt
    const hashedPassword = await await hashPassword(password);

    // First, find or create the user
    const user = await prisma.users.upsert({
      where: { email: email },
      update: {}, // No update needed for user
      create: {
        email: email,
        first_name: first_name,
        last_name: last_name,
        town: town,
        countyId: countyId,
        address: address,
        mobile: mobile,
        password: hashedPassword,
        zip_code: zip_code,
        farmname: farmname
      }
    });

    // Step 2: Connect or create the scope
    const userRole = await prisma.user_roles.upsert({
      where: { role_name: "User", user_id: user.id },
      update: {}, // If the scope already exists, no updates needed
      create: {
        role_name: "User",
        user_id: user.id
      }
    });

    // Step 2: Connect or create the scope
    const scope = await prisma.scopes.upsert({
      where: { scope_name: "user_read" },
      update: {}, // If the scope already exists, no updates needed
      create: {
        scope_name: "user_read",
        description: "General user permission, read only."
      }
    });

    // Step 3: Create the user_role_scope by connecting the userRole and scope
    const userRoleScopes = await prisma.user_role_scope.upsert({
      where: {
        role_id_scope_id: { role_id: userRole.id, scope_id: scope.id } // composite unique key
      },
      update: {},
      create: {
        role: { connect: { id: userRole.id } },
        scope: { connect: { id: scope.id } }
      }
    });

    // 7. Return the tokens to the client
    return {
      statusCode: 200,
      statusMessage: " User added successfully!"
      // user:JSON.stringify(user),
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Login failed:", error);
      return {
        statusCode: 400,
        message: "Internal server error..!",
        statusMessage: error.message // Now safe to access message
      };
    } else {
      // Handle case where error is not an instance of Error
      console.error("Unknown error:", error);
      return {
        statusCode: 400,
        message: "Internal server error..!",
        statusMessage: "Unknown error" // Default error message
      };
    }
  }
});
