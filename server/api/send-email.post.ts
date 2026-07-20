import { PrismaClient } from "@prisma/client";
import { defineEventHandler, readBody } from "h3";
import nodemailer from "nodemailer";
const prisma = new PrismaClient();
export default defineEventHandler(async (event) => {
  const { to, subject, text } = await readBody(event);
  try {
    // Create a transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com", // Replace with your SMTP server
      port: 587, // Use port 465 for secure connections
      secure: false, // true for port 465, false for other ports
      auth: {
        user: process.env.VITE_EMAIL, // Your SMTP username
        pass: process.env.VITE_EMAIL_PASSWORD // Your SMTP password
      }
    });

    // Send the email
    await transporter.sendMail({
      from: `"Horse and breeder" <${process.env.VITE_EMAIL}>`, // Sender address
      to, // List of recipients
      subject, // Subject line
      text // Plain text body
    });

    // const response = await prisma.tbl_color.findMany({
    //     orderBy:{
    //         color_name:"asc"
    //     }
    // });
    return {
      message: "Email sent successfully",
      status: 200

      // body: JSON.stringify(response)
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return {
        status: 400,
        message: error.message,
        to: to,
        sub: subject,
        text: text,
        statusMessage: "Bad request"
      };
    } else {
      // Handle case where the error is not an instance of Error
      return {
        status: 400,
        message: "Unknown error",
        to: to,
        sub: subject,
        text: text,
        statusMessage: "Bad request"
      };
    }
  }
});
