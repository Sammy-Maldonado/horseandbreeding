import { PrismaClient } from "@prisma/client";
import validateApiKey from '../middleware/validateApiKey';
const prisma = new PrismaClient();
// @ts-ignore
export default  defineEventHandler(async(event) => {
  await validateApiKey(event);
  try {
    const body = await readBody(event)
    
    const headers = event.req.headers;
    const apiKey = headers['api-key'];
    console.log('Request Body:', body);
    // console.log('API Key header:', apiKey);
    // Read request headers
    // const headers = await readHeaders(event);
    // const apiKey = headers['x-api-key'];// api:process.env.VITE_API_KEY,
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