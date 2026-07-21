import { PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";
import { activeHorseFilter, storehorseSupportsStatus } from "../utils/storehorse-compat";

const prisma = new PrismaClient();
const STALLION=0;
const MARE =2;
// @ts-ignore
export default defineEventHandler(async (event) => {
  await validateApiKey(event)
  try {
    // @ts-ignore1
    const body = await readBody(event);

    if ( !body.search || body.search?.length < 3) {
      return {
        status: 500,
        body: JSON.stringify({ error: "Error the data define" }),
      };
    } 
    let search=body.search;
    let sex= body.sex == STALLION ? STALLION:MARE;
    const supportsStatus = await storehorseSupportsStatus(prisma);

    const count  = await prisma.storehorse.count({
        where: {
            name: {
                contains: search, // Partial match for name
            },
            sexe: {
                equals: sex // Exact match for sex
            },
            // Ensure status is 1, where the database has the column
            ...activeHorseFilter(supportsStatus)
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
