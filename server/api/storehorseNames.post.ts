import { PrismaClient } from "@prisma/client";
import validateApiKey from '../middleware/validateApiKey';
const prisma = new PrismaClient();
// @ts-ignore
export default defineEventHandler(async (event) => {
  await validateApiKey(event);
  
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
      console.error("Error fetching data:", error);
      return {
        status: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
      };
    } finally {
      await prisma.$disconnect();
    }
  });

  