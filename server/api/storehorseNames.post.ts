import { PrismaClient } from "@prisma/client";
import { createError, isError } from "h3";
const prisma = new PrismaClient();
// @ts-ignore
export default defineEventHandler(async (event) => {
  
    try {
        // @ts-ignore
        const body = await readBody(event);
        let _limit = Number(body.limit);
        let _skip = Number(body.skip);
        let _breederid = Number(body.breederid);
        const apiResponse = await await prisma.storehorse.findMany({
            where: {
                breederid: _breederid
            },
            orderBy: {
              birthyear: 'desc' // or 'desc' for descending order
            },
            include: {
                breeders:{
                    select:{
                        breedername:true,
                        farmname:true,
                    },
                    where:{
                        breedername:{
                            not:null,
                        }
                    }
                }
            },
            take:_limit,
            skip:_skip
            
        });
      return {
        status: 200,
        // body:apiResponse
        body: JSON.stringify(apiResponse),
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

  