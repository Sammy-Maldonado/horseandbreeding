import { PrismaClient } from "@prisma/client";
import { createError, defineEventHandler, readBody } from "h3";
import nodemailer from "nodemailer";
const prisma = new PrismaClient();
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null);
  const to = body?.to;
  const subject = body?.subject;
  const text = body?.text;

  if (!to || !subject || !text) {
    throw createError({
      statusCode: 400,
      message: "Recipient, subject and message are all required.",
      statusMessage: "Bad request"
    });
  }

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
    // The mail provider failed, not the caller. The SMTP error and the message
    // that was being sent stay in the server log — echoing the recipient,
    // subject and body back to the client leaked them (CLAUDE.md §7).
    console.error("Sending the email failed:", error);
    throw createError({
      statusCode: 500,
      message: "The email could not be sent. Please try again later.",
      statusMessage: "Internal Server Error"
    });
  }
});
