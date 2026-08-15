import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { defineEventHandler } from "h3";

import { registerUser } from "../utils/registration";

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
    const hashedPassword = await hashPassword(password);

    // Step 2: Create user, role, scope and role-scope link atomically — a
    // failure in any write rolls the whole registration back, so no orphaned
    // users row is left behind and the same email can retry cleanly.
    await registerUser(prisma, {
      email,
      first_name,
      last_name,
      town,
      countyId,
      address,
      mobile,
      hashedPassword,
      zip_code,
      farmname
    });

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
