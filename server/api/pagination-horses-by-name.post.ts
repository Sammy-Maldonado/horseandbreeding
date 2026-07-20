import { PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";

const prisma = new PrismaClient();

// @ts-ignore
export default defineEventHandler(async (event) => {
  await validateApiKey(event)
  try {
    // @ts-ignore1
    const body = await readBody(event);

    if ( !body.search || body.search?.length < 3 ) {
      return {
        status: 500,
        body: JSON.stringify({ error: "Error the data define" }),
      };
    } 
    let search=body.search;

    const count  = await prisma.storehorse.count({
        where: {
            name: {
                contains: search, // Partial match for name
            },
            status:1
        }
    });
    return {
      status: 200,
      body:JSON.stringify({
        pages : Math.ceil( count /10 ),
        total : count
      }),  
    };
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
