import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { defineEventHandler } from "h3";
const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  // @ts-ignore1
  const { email, password } = await readBody(event);
  try {
    // 1. Validate the client_id
    const client_id = "horseandbreeder-app";

    // 2. Find the user by email
    const user = await prisma.users.findFirst({
      select: {
        email: true,
        mobile: true,
        id: true,
        password: true
      },
      where: { email: email }
    });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // 3. Validate the password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error(isPasswordValid.toString());
    }
    // 4. Generate JWT access token and refresh token
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, mobile: user.mobile },
      process.env.VITE_JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1h" } // Access token valid for 1 hour
    );

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, mobile: user.mobile },
      process.env.VITE_JWT_SECRET || "your_jwt_secret",
      { expiresIn: "7d" } // Refresh token valid for 7 days
    );

    // 5. Store the access token in the access_tokens table
    await prisma.access_tokens.create({
      data: {
        token: accessToken,
        user_id: user.id,
        client_id: client_id,
        scope: "read", // Adjust the scope as needed
        created_at: new Date(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiration
      }
    });

    // 6. Store the refresh token in the refresh_tokens table
    await prisma.refresh_tokens.create({
      data: {
        token: refreshToken,
        user_id: user.id,
        client_id: client_id,
        created_at: new Date(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiration
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
