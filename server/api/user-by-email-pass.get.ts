import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { defineEventHandler, getQuery } from "h3";
const prisma = new PrismaClient();
export default defineEventHandler(async (event) => {
  try {
    // Regular expression for email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const data = getQuery(event);
    const { password } = data;
    const email = typeof data.email === "string" ? data.email : undefined;
    if (!email || !password) {
      return {
        statusCode: 400,
        statusMessage: "Email and password are required."
      };
    }
    if (!email || !emailRegex.test(email)) {
      return {
        statusCode: 400,
        statusMessage: `Invalid email <b>${data.email}</b> format.`
      };
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
        return {
          statusCode: 401,
          statusMessage: message
        };
      }
    }
    return {
      statusCode: 404,
      statusMessage: message
    };
  } catch (error) {
    console.error("Login failed:", error);
    return {
      statusCode: 500,
      statusMessage: "An unexpected error occurred. Please try again later."
    };
  }
});
