import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { defineEventHandler } from "h3";
const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    // @ts-ignore1
    const { refreshToken } = await readBody(event);
    // 1. Validate the client_id
    const client_id = "horseandbreeder-app";

    const refreshAccessToken = await prisma.refresh_tokens.findFirst({
      where: { token: refreshToken }
    });
    if (!refreshAccessToken) {
      throw new Error("Invalid refresh access token..!");
    }

    let decoded;
    try {
      const jwT = process.env.VITE_JWT_SECRET || "your_jwt_secret";
      decoded = jwt.verify(refreshToken, jwT);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return {
          statusCode: 400,
          message: "Error producing",
          statusMessage: error.message
        };
      }
      // Handle the case when error is not an instance of Error
      return {
        statusCode: 400,
        message: "Unknown error",
        statusMessage: "An unknown error occurred"
      };
    }

    const { userId, email, mobile } = decoded;
    // 4. Generate JWT access token and refresh token
    const accessToken = jwt.sign(
      { userId: userId, email: email, mobile: mobile },
      process.env.VITE_JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1h" } // Access token valid for 1 hour
    );

    // 5. Store the access token in the access_tokens table
    await prisma.access_tokens.create({
      data: {
        token: accessToken,
        user_id: userId,
        client_id: client_id,
        scope: "read", // Adjust the scope as needed
        created_at: new Date(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiration
      }
    });

    // 7. Return the tokens to the client
    return {
      statusCode: 200,
      message: "Successful..!",
      accessToken: accessToken,
      refreshToken: refreshToken,
      expires_in: 3600 // 1 hour
    };
  } catch (error) {
    console.error("Login failed:", error);
    return {
      statusCode: 400,
      message: "Internal server error..!",
      statusMessage: "Bad request"
    };
  }
});
