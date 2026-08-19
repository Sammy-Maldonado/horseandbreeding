import { PrismaClient } from "@prisma/client";
import { activeHorseFilter } from "../utils/storehorse-compat";

const prisma = new PrismaClient();

// @ts-ignore
export default defineEventHandler(async (event) => {
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
            // Ensure status is 1
            ...activeHorseFilter()
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
