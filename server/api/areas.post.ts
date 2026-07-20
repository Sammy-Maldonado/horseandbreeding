import { PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";
import { defineEventHandler } from "h3";
const prisma = new PrismaClient();
export default defineEventHandler(async (event) => {
  await validateApiKey(event);
  try {
    // @ts-ignore1
    const { county_id } = await readBody(event);
    if (!county_id) {
      throw new Error("Missin variables");
    }
    const response = await prisma.areas.findMany({
      select: {
        id: true,
        name: true,
        full_name: true,
        county: true,
        status: true
      },
      where: {
        county_id: county_id,
        status: 1
      }
    });

    return {
      statusCode: 200,
      message: "Successful..!",
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.log("Error produssing..!");
    return {
      statusCode: 400,
      message: "Error produssing ..!",
      statusMessage: "Bad request"
    };
  }
});
