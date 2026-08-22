import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { createError, defineEventHandler, getQuery, isError } from "h3";
const prisma = new PrismaClient();
export default defineEventHandler(async (event) => {
  try {
    // Regular expression for email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const data = getQuery(event);
    const { password } = data;
    const email = typeof data.email === "string" ? data.email : undefined;
    if (!email || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: "Email and password are required."
      });
    }
    if (!email || !emailRegex.test(email)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid email <b>${data.email}</b> format.`
      });
    }
    // Step 1: Hash the new password using bcrypt
    const findUser = await prisma.users.findUnique({
      select: {
        first_name: true,
        last_name: true,
        town: true,
        countyId: true,
        address: true,
        mobile: true,
        zip_code: true,
        farmname: true,
        password: true,
        email: true
      },
      where: { email: email }
    });
    let message = `The email address <b> ${data.email} </b> is not found in our system. You are welcome to proceed with creating a new user account.`;
    if (findUser) {
      const isPasswordValid = await bcrypt.compare(
        password as string,
        findUser.password
      );
      if (isPasswordValid) {
        return {
          statusCode: 200,
          statusMessage:
            "Login is successful. You have been successfully logged in.",
          body: JSON.stringify({ ...findUser, password: password })
        };
      } else {
        message = `The email address <b> ${data.email} </b> already exists in our system. However, the password provided is incorrect. Please verify your password and try again.`;
        throw createError({
          statusCode: 401,
          statusMessage: message
        });
      }
    }
    // Not an error the caller made: the wizard asks this question precisely to
    // learn whether the address is free, and 404 is that answer.
    throw createError({
      statusCode: 404,
      statusMessage: message
    });
  } catch (error) {
    if (isError(error)) {
      // 400, 401 and 404 above are deliberate answers, not failures to hide.
      throw error;
    }
    console.error("Login failed:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "An unexpected error occurred. Please try again later."
    });
  }
});
