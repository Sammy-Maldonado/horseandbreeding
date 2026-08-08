import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
// @ts-ignore
export default  defineEventHandler(async(event) => {
  try {
    const body = await readBody(event)

    console.log('Request Body:', body);
  return {status: 200,body:body}
  } catch (error) {
    console.error("Error fetching data:", error);
    return {
      status: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  } finally {
    await prisma.$disconnect();
  }
});