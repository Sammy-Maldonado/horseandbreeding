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
    const { userData, userInfo } = await readBody(event);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const email =
      typeof userInfo.email === "string" ? userInfo.email : undefined;
    if (!email || !userInfo.password) {
      return {
        statusCode: 400,
        statusMessage: "Email and password are required."
      };
    }
    if (!email || !emailRegex.test(email)) {
      return {
        statusCode: 400,
        statusMessage: `Invalid email <b>${userInfo.email}</b> format.`
      };
    }
    if (userInfo.password?.length < 8) {
      return {
        statusCode: 400,
        statusMessage: `Password <b>"${userInfo.password}"</b> must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character.`
      };
    }
    const findUser = await prisma.users.findUnique({
      where: { email: userInfo.email }
    });
    let updateData = {};
    let message = `Welcome! The user account for <b>${userInfo.email}</b> has been successfully created.`;
    if (findUser) {
      const isPasswordValid = await bcrypt.compare(
        userInfo.password,
        findUser.password
      );
      if (isPasswordValid) {
        delete userData.password;
        delete userData.email;
        updateData = userData;
        message = `The user account for <b>${userInfo.email}</b> has been successfully updated. Welcome back!`;
      } else {
        message = `The user account for <b>${userInfo.email}</b> could not be updated due to an incorrect password. Please try again with the correct password.`;
        return {
          statusCode: 401,
          statusMessage: message
        };
      }
    }

    const hashedPassword = await await hashPassword(userInfo.password);
    // First, find or create the user
    const user = await prisma.users.upsert({
      where: { email: userInfo.email },
      update: updateData, // No update needed for user when updateData is {}
      create: {
        ...userData,
        email: userInfo.email,
        password: hashedPassword
      }
    });
    // 7. Return the tokens to the client
    return {
      statusCode: 200,
      statusMessage: message,
      // user:JSON.stringify(user),
      user: user
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Login failed:", error);
      return {
        statusCode: 400,
        message: "Internal server error..!",
        statusMessage: error.message // Now it's safe to access error.message
      };
    } else {
      console.error("Unknown error:", error);
      return {
        statusCode: 400,
        message: "Internal server error..!",
        statusMessage: "Unknown error occurred"
      };
    }
  }
});
