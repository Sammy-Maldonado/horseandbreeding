import { PrismaClient } from "../../generated/prisma/client";
import { createMariaDbAdapter } from "../utils/prismaAdapter";
import { createError, defineEventHandler } from "h3";

import { toPublicErrorResponse, ValidationError } from "../utils/publicError";
const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });
export default defineEventHandler(async (event) => {
  try {
    // @ts-ignore1
    const body = await readBody(event).catch(() => null);
    const county_id = body?.county_id;
    if (!county_id) {
      throw new ValidationError("A county is required.");
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
    console.error("Loading areas failed:", error);
    throw createError(toPublicErrorResponse(error));
  }
});
