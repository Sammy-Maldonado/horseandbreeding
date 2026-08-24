import { PrismaClient } from "../../generated/prisma/client";
import { createMariaDbAdapter } from "../utils/prismaAdapter";
import { createError, isError } from "h3";
const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });
// @ts-ignore
export default defineEventHandler(async (event) => {
  try {
    // @ts-ignore
    const data = getQuery(event);
    // let _limit = Number(data.limit);
    // let _skip = Number(data.skip);
    // let _breederid = Number(data.breederid);
    const apiResponse = await prisma.vendor.create({
      data: {
        vendor_name: data.name as string,
        vendor_contact: data.contact as string,
        vendor_address: data.address as string
      }
    });
    const { vendor_id } = apiResponse;
    return {
      status: 200,
      // body: JSON.stringify(event),
      body: JSON.stringify({ id: vendor_id })
    };
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
