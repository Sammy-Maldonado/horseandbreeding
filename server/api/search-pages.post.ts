import { PrismaClient, Prisma } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";
import { activeHorseFilter, storehorseSupportsStatus } from "../utils/storehorse-compat";

const prisma = new PrismaClient();

const searchHorses = async (name:string, supportsStatus: boolean ) => {
    const conditions: Prisma.storehorseWhereInput[] = [];
  
    // Add name condition if provided
    if (name) {
        conditions.push({ name: { contains: name } }); // Removed `mode: 'insensitive'`
      }
  
    const result = await prisma.storehorse.count({
      where: {
        // If there are any conditions, add them to OR
        ...(conditions.length > 0 && { OR: conditions }),
        // Ensure status is 1, where the database has the column
        ...activeHorseFilter(supportsStatus),
      },
    });
  
    return result;
  };
  
// @ts-ignore
export default defineEventHandler(async (event) => {
  await validateApiKey(event)
  try {
    // @ts-ignore1
    const body = await readBody(event);
     
    if ( !body.search) {
      return {
        status: 500,
        body: JSON.stringify({ error: "Error the data define" }),
      };
    } 
    let search=body.search;
    const supportsStatus = await storehorseSupportsStatus(prisma);
    const count = await searchHorses(search, supportsStatus);
    return {
        statusCode: 200,
        data:JSON.stringify({
          pages : Math.ceil( count /50 ),
          total : count
        }),        
        message:'Successful..!'
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
