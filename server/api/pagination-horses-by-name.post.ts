import { PrismaClient } from "@prisma/client";
import { createError, isError } from "h3";
import { activeHorseFilter } from "../utils/storehorse-compat";

const prisma = new PrismaClient();

// @ts-ignore
export default defineEventHandler(async (event) => {
  try {
    // @ts-ignore1
    const body = await readBody(event);

    if ( !body.search || body.search?.length < 3 ) {
      // A required field is missing or too short: the caller's mistake,
      // not a server failure (HOR-96).
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        message: "Error the data define"
      });
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
    // The guard above raises its own 400; anything that reaches here
    // failed on our side and stays a 500 (CLAUDE.md §7).
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
