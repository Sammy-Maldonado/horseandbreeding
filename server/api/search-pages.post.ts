import { PrismaClient, Prisma } from "../../generated/prisma/client";
import { createMariaDbAdapter } from "../utils/prismaAdapter";
import { activeHorseFilter } from "../utils/storehorse-compat";
import { createError, isError } from "h3";

const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });

const searchHorses = async (name:string ) => {
    const conditions: Prisma.storehorseWhereInput[] = [];
  
    // Add name condition if provided
    if (name) {
        conditions.push({ name: { contains: name } }); // Removed `mode: 'insensitive'`
      }
  
    const result = await prisma.storehorse.count({
      where: {
        // If there are any conditions, add them to OR
        ...(conditions.length > 0 && { OR: conditions }),
        // Ensure status is 1
        ...activeHorseFilter(),
      },
    });
  
    return result;
  };
  
// @ts-ignore
export default defineEventHandler(async (event) => {
  try {
    // @ts-ignore1
    const body = await readBody(event);
     
    if ( !body.search) {
      // A required field is missing or too short: the caller's mistake,
      // not a server failure (HOR-96).
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        message: "Error the data define"
      });
    } 
    let search=body.search;
    const count = await searchHorses(search);
    return {
        statusCode: 200,
        data:JSON.stringify({
          pages : Math.ceil( count /50 ),
          total : count
        }),        
        message:'Successful..!'
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
