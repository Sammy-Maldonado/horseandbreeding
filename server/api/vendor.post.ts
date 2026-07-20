import { PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";
const prisma = new PrismaClient();
// @ts-ignore
export default defineEventHandler(async (event) => {
  await validateApiKey(event);
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
    console.error("Error fetching data:", error);
    return {
      status: 500,
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  } finally {
    await prisma.$disconnect();
  }
});
