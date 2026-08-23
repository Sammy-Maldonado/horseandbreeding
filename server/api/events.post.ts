import { PrismaClient } from "../../generated/prisma/client";
import { createMariaDbAdapter } from "../utils/prismaAdapter";
import { createError, isError } from "h3";
const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });
// @ts-ignore
export default  defineEventHandler(async(event) => {
  try {
    const body = await readBody(event)

    console.log('Request Body:', body);
  return {status: 200,body:body}
  } catch (error) {
    // A deliberate HTTP error keeps the status it was raised with;
    // anything else failed on our side, so it is a 500 and the raw
    // error stays in the log (CLAUDE.md §7).
    if (isError(error)) {
      throw error;
    }
    console.error("Error fetching data:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      message: "Internal Server Error"
    });
  } finally {
    await prisma.$disconnect();
  }
});